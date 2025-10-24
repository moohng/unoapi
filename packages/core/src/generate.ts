import * as path from 'path';
import { OpenAPIObject, ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject, parseUrl } from './parse.js';
import { formatObjName, upperFirst } from './tools.js';
import {
  transformQueryCode,
  transformApiCode,
  ApiOperationObject,
  TypeFieldOption,
  ApiCodeContext,
  transformModelCode,
} from './transform.js';
import { searchApi } from './doc.js';
import { FuncTplCallback } from './config.js';

/**
 * 生成的代码上下文
 */
export interface GenerateCodeContext {
  sourceType: 'api' | 'model';
  sourceCode: string;
  /** 函数名称 */
  funcName?: string;
  /** 类型名称 Abc */
  typeName?: string;
  /** 文件名称 abc */
  fileName: string;
  /** 文件全名称 abc.ts */
  fileFullName: string;
  /** 文件相对目录 users */
  fileDir?: string;
  /** 文件相对路径 users/abc.ts */
  filePath: string;
}

/**
 * 生成代码
 * @param urls 接口 URL 列表，空表示生成所有
 */
export async function generateCode(doc: OpenAPIObject, urls: (string | ApiOperationObject)[], options?: GenerateOptions) {
  const apis = await searchApi(doc);

  const results: Promise<GenerateCodeContext[]>[] = [];
  if (urls.length === 0) {
    // 生成所有
    for (const item of apis) {
      results.push(generateSingleApiCode(doc, item, options));
    }
  } else {
    for (const url of urls) {
      if ((url as ApiOperationObject).path) {
        results.push(generateSingleApiCode(doc, url as ApiOperationObject, options));
        continue;
      }
      const matched = apis.filter((item) => item.path === url);
      if (matched.length) {
        for (const item of matched) {
          results.push(generateSingleApiCode(doc, item, options));
        }
      } else {
        console.warn('未找到匹配的接口：', url);
      }
    }
  }

  return Promise.all(results).then((res) => res.flat());
}

interface GenerateOptions {
  onlyModel?: boolean; // 仅生成模型代码
  funcTpl?: FuncTplCallback; // 自定义函数模板
}

interface GenerateSingleOptions extends GenerateOptions {
  funcName?: string; // 自定义函数名称
}

/**
 * 生成单个 API 代码
 * @param parsedApi 解析后的 API 对象
 * @param options 生成选项
 */
export async function generateSingleApiCode(doc: OpenAPIObject, parsedApi: ApiOperationObject, options?: GenerateSingleOptions) {
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

  const generateCodeContextList: GenerateCodeContext[] = [];

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
    const { type, refs } = parseSchemaObject(schema);
    bodyTypeName = type;
    apiRefs.push(...refs);
  }

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
      const { code, refs } = await transformQueryCode(queryParams, queryTypeName);
      apiRefs.push(...refs);
      const fileFullName = `${queryTypeName}.ts`;
      const queryFileDir = path.join(dirName || '', 'query');
      const filePath = path.join(queryFileDir, fileFullName);

      generateCodeContextList.push({
        sourceType: 'model',
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
          const { type, refs } = parseSchemaObject(schema);
          responseTypeName = type;
          apiRefs.push(...refs);
        }
      }
      break;
    }
  }

  if (!options?.onlyModel) {
    // 构建 API 上下文
    let apiContext: ApiCodeContext = {
      api: parsedApi,
      url: parsedApi.path,
      method: parsedApi.method,
      name: funcName,
      pathParams,
      queryType: queryTypeName,
      bodyType: bodyTypeName,
      responseType: responseTypeName,
      comment: parsedApi.summary || parsedApi.description || '',
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
      sourceCode = await transformApiCode(apiContext);
    }

    const fileFullName = `${fileNameWithoutExt}.ts`;
    const filePath = path.join(dirName || '', fileFullName);
    generateCodeContextList.push({
      sourceType: 'api',
      sourceCode,
      fileName: fileNameWithoutExt,
      fileFullName,
      fileDir: dirName,
      filePath,
      funcName,
    });
  }

  console.log('当前 api 引用的模型：', apiRefs);
  if (doc.components?.schemas) {
    const fileDir = path.join(dirName || '', 'model');
    const results = await generateModelCode(doc.components?.schemas, [...apiRefs]);
    for (const codeContext of results || []) {
      const filePath = path.join(fileDir, codeContext.fileFullName);
      generateCodeContextList.push({
        ...codeContext,
        sourceType: 'model',
        fileDir,
        filePath,
      });
    }
  }

  return generateCodeContextList;
}

/**
 * 生成模型代码
 * @param refs 模型引用列表
 * @returns
 */
async function generateModelCode(schemas: Record<string, ReferenceObject | SchemaObject>, refs: string[]): Promise<GenerateCodeContext[]> {
  const allRefsSet = new Set<string>(refs);
  const allContextList: GenerateCodeContext[] = [];

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
    const { code, refs } = await transformModelCode(modelObj as SchemaObject, refKey);
    for (const subRef of refs) {
      allRefsSet.add(subRef);
    }
    
    const fileFullName = `${objName}.ts`;
    allContextList.push({
      sourceType: 'model',
      sourceCode: code,
      typeName: objName,
      fileName: objName,
      fileFullName,
      filePath: '',
    });
  }

  for (const ref of allRefsSet) {
    await generateCode(ref);
  }

  return allContextList;
}
