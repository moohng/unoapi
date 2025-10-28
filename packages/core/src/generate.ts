import * as path from 'path';
import { OpenAPIObject, ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject, parseUrl } from './parse.js';
import { formatObjName, upperFirst } from './tools.js';
import {
  transformQueryCode,
  transformApiCode,
  ApiOperationObject,
  TypeFieldOption,
  ApiContext,
  transformModelCode,
} from './transform.js';
import { searchApi } from './doc.js';
import { FuncTplCallback } from './config.js';

/**
 * 生成的代码
 */
interface GenerateCode {
  sourceCode: string;
  /** 文件名称 abc */
  fileName: string;
  /** 文件全名称 abc.ts */
  fileFullName: string;
  /** 文件相对目录 users */
  fileDir: string;
  /** 文件相对路径 users/abc.ts */
  filePath: string;
}

/**
 * 生成的模型
 */
export interface GenerateModel extends GenerateCode {
  /** 类型名称 Abc */
  typeName?: string;
}

/**
 * 生成的 API
 */
export interface GenerateApi extends GenerateCode {
  /** 函数名称 */
  funcName: string;
  /** api 模型引用 */
  refs?: string[];
  /** 生成模型 */
  generateModels: (schemas: Record<string, ReferenceObject | SchemaObject>) => Promise<GenerateModel[]>;
}

interface GenerateOptions {
  /** 自定义类型映射 */
  typeMapping?: Record<string, string>;
  /** 自定义函数模板 */
  funcTpl?: FuncTplCallback;
}

/**
 * 生成代码
 * @param doc OpenAPI 文档对象
 * @param urls 接口 URL 列表，空表示生成所有
 * @param options 生成选项
 */
export async function generateCode(doc: OpenAPIObject, urls: (string | ApiOperationObject)[], options?: GenerateOptions) {
  const apis = await searchApi(doc);

  const results: GenerateApi[] = [];
  if (urls.length === 0) {
    // 生成所有
    for (const item of apis) {
      results.push(await generateSingleApiCode(item, options));
    }
  } else {
    for (const url of urls) {
      if ((url as ApiOperationObject).path) {
        results.push(await generateSingleApiCode(url as ApiOperationObject, options));
        continue;
      }
      const matched = apis.filter((item) => item.path === url);
      if (matched.length) {
        for (const item of matched) {
          results.push(await generateSingleApiCode(item, options));
        }
      } else {
        console.warn('未找到匹配的接口：', url);
      }
    }
  }

  return Promise.all(results);
}

interface GenerateSingleOptions extends GenerateOptions {
  funcName?: string; // 自定义函数名称
}

/**
 * 生成单个 API 代码
 * @param parsedApi 解析后的 API 对象
 * @param options 生成选项
 */
export async function generateSingleApiCode(parsedApi: ApiOperationObject, options?: GenerateSingleOptions): Promise<GenerateApi> {
  console.log(`生成单个 api 代码：[${parsedApi.method}] ${parsedApi.path}`);

  let { funcName, fileName: fileNameWithoutExt, dirName, pathStrParams } = parseUrl(parsedApi.path);

  // 文件名称
  const tagName = parsedApi.tags?.[0];
  if (tagName && /^[\w\s-]+$/.test(tagName)) {
    fileNameWithoutExt = tagName.split(/[\s-_]/)
      .filter(item => item && item.toLowerCase() !== 'controller')
      .map((item, index) => index === 0 ? item.toLowerCase() : upperFirst(item))
      .join('');
  }

  // 函数名称
  const defaultFuncName = parsedApi.operationId?.split(/[\s-_]/).pop();
  funcName = options?.funcName || defaultFuncName || funcName;

  // path 参数
  const pathParams: TypeFieldOption[] = pathStrParams.map((name) => ({
    name,
    type: 'string',
    required: true,
  }));

  const apiRefs: string[] = [];

  // 入参
  let bodyTypeName: string | undefined;
  if (parsedApi.requestBody) {
    const reqBody = parsedApi.requestBody;
    let schema: ReferenceObject | SchemaObject | undefined;
    if ((reqBody as RequestBodyObject)?.content) {
      const mediaType = Object.keys((reqBody as RequestBodyObject).content)[0];
      schema = (reqBody as RequestBodyObject).content[mediaType].schema;
    } else {
      schema = reqBody as ReferenceObject;
    }
    const { type, refs } = parseSchemaObject(schema, options?.typeMapping);
    bodyTypeName = type;
    apiRefs.push(...refs);
  }

  const generateModelContextList: GenerateModel[] = [];

  let queryTypeName: string | undefined;
  if (parsedApi.parameters?.length) {
    const queryParams: ParameterObject[] = [];
    for (const param of parsedApi.parameters as ParameterObject[]) {
      if (param.in === 'path') {
        const _param = param as ParameterObject;
        const idx = pathParams.findIndex((item) => item.name === _param.name);
        if (idx > -1) {
          pathParams[idx].description = _param.description;
          pathParams[idx].schema = _param.schema;
        }
      } else if (param.in === 'query') {
        queryParams.push(param);
      }
      // 忽略: header、cookie 参数
    }

    // 生成 query 类型
    if (queryParams.length) {
      queryTypeName = `${upperFirst(fileNameWithoutExt)}${upperFirst(funcName)}Query`;
      const { code, refs } = transformQueryCode(queryParams, queryTypeName, options?.typeMapping);
      apiRefs.push(...refs);
      const fileFullName = `${queryTypeName}.ts`;
      const queryFileDir = path.join(dirName || '', 'query');
      const filePath = path.join(queryFileDir, fileFullName);

      generateModelContextList.push({
        sourceCode: code,
        typeName: queryTypeName,
        fileName: queryTypeName,
        fileFullName,
        fileDir: queryFileDir,
        filePath,
      });
    }
  }

  // 出参
  let responseTypeName = '';
  for (const key in parsedApi.responses) {
    if (key.startsWith('2')) {
      const resp = parsedApi.responses[key] as ResponseObject;
      if (resp.content) {
        const mediaType = Object.keys(resp.content)[0];
        const schema = resp.content[mediaType].schema;
        if (schema) {
          const { type, refs } = parseSchemaObject(schema, options?.typeMapping);
          responseTypeName = type;
          apiRefs.push(...refs);
        }
      }
      break;
    }
  }

  // 构建 API 上下文
  let apiContext: ApiContext = {
    api: parsedApi,
    url: parsedApi.path,
    method: parsedApi.method,
    name: funcName,
    pathParams,
    queryType: queryTypeName,
    bodyType: bodyTypeName,
    responseType: responseTypeName,
    comment: parsedApi.summary || parsedApi.description || '',
    refs: apiRefs,
  };

  let sourceCode = '';
  if (typeof options?.funcTpl === 'function') {
    const result = await options?.funcTpl(apiContext);
    console.log('自定义函数模板输出结果', result);
    if (typeof result === 'string') {
      sourceCode = result;
    }
  }
  if (!sourceCode) {
    sourceCode = transformApiCode(apiContext, options?.typeMapping);
  }

  const fileFullName = `${fileNameWithoutExt}.ts`;
  const filePath = path.join(dirName || '', fileFullName);

  console.log('当前 api 引用的模型：', apiRefs);

  return {
    sourceCode,
    fileName: fileNameWithoutExt,
    fileFullName,
    fileDir: dirName,
    filePath,
    funcName,
    refs: apiRefs,
    generateModels: async (schemas) => {
      const fileDir = path.join(dirName || '', 'model');
      const results = await generateModelCode(schemas, apiRefs, options?.typeMapping);
      for (const codeContext of results || []) {
        const filePath = path.join(fileDir, codeContext.fileFullName);
        generateModelContextList.push({
          ...codeContext,
          fileDir,
          filePath,
        });
      }
      return generateModelContextList;
    },
  };
}

/**
 * 生成模型代码
 * @param refs 模型引用列表
 * @returns
 */
export async function generateModelCode(schemas: Record<string, ReferenceObject | SchemaObject>, refs: string[], typeMapping?: Record<string, string>) {
  const allRefsSet = new Set<string>(refs);
  const allContextList: GenerateModel[] = [];

  async function generateCode(ref: string) {
    let refKey = ref.replace('#/components/schemas/', '');
    let modelObj: SchemaObject | ReferenceObject | undefined;
    modelObj = schemas[refKey];
    if (!modelObj) {
      console.error(`${refKey} 不存在！`);
      return;
    }

    if ((modelObj as ReferenceObject).$ref) {
      await generateCode((modelObj as ReferenceObject).$ref);
      return;
    }

    // 对象名称
    let objName = formatObjName(refKey);
    const { properties } = modelObj as SchemaObject;
    if (!objName || !properties || /^[a-z]/.test(objName)) {
      return;
    }

    // 拼接代码
    const { code, refs } = transformModelCode(modelObj as SchemaObject, refKey, typeMapping);
    for (const subRef of refs) {
      allRefsSet.add(subRef);
    }
    
    const fileFullName = `${objName}.ts`;
    allContextList.push({
      sourceCode: code,
      typeName: objName,
      fileName: objName,
      fileFullName,
      fileDir: '',
      filePath: '',
    });
  }

  for (const ref of allRefsSet) {
    await generateCode(ref);
  }

  return allContextList;
}
