import * as path from 'path';
import { ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
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
  /** 类型名称 */
  typeName: string;
}

interface ModelSchemaCollection {
  [schema: string]: SchemaObject | ReferenceObject;
}

/**
 * 生成的 API
 */
export interface GenerateApi extends GenerateCode {
  /** api 模型引用 */
  refs?: string[];
  /** 生成模型 */
  getModels: (schemas: ModelSchemaCollection) => GenerateModel[];
}

interface GenerateOptions {
  /** 自定义类型映射 */
  typeMapping?: Record<string, string>;
  /** 自定义函数模板 */
  funcTpl?: FuncTplCallback;
}

/**
 * 生成代码
 * @param apis api 列表
 * @param options 生成选项
 */
export function generateCode(apis: ApiOperationObject[], options?: GenerateOptions) {
  return apis.map((api) => generateSingleApiCode(api, options));
}

interface GenerateSingleOptions extends GenerateOptions {
  funcName?: string; // 自定义函数名称
}

/**
 * 生成单个 API 代码
 * @param parsedApi 解析后的 API 对象
 * @param options 生成选项
 */
export function generateSingleApiCode(parsedApi: ApiOperationObject, options?: GenerateSingleOptions) {
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
    const result = options?.funcTpl(apiContext);
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
    refs: apiRefs,
    getModels: (schemas) => {
      const fileDir = path.join(dirName || '', 'model');
      const results = generateModelCode(schemas, apiRefs, { typeMapping: options?.typeMapping });
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
  } as GenerateApi;
}

interface GenerateModelOptions {
  typeMapping?: Record<string, string>
}

/**
 * 生成模型代码
 * @param schemas schema 模型集合
 * @param refs 模型引用列表
 * @param options 选项
 * @returns
 */
export function generateModelCode(schemas: ModelSchemaCollection, refs: string[], options?: GenerateModelOptions) {
  const allRefsSet = new Set<string>(refs);
  const allContextList: GenerateModel[] = [];

  function generateCode(ref: string) {
    let refKey = ref.replace('#/components/schemas/', '');
    let modelObj: SchemaObject | ReferenceObject | undefined;
    modelObj = schemas[refKey];
    if (!modelObj) {
      console.error(`${refKey} 不存在！`);
      return;
    }

    if ((modelObj as ReferenceObject).$ref) {
      generateCode((modelObj as ReferenceObject).$ref);
      return;
    }

    // 对象名称
    let objName = formatObjName(refKey);
    const { properties } = modelObj as SchemaObject;
    if (!objName || !properties || /^[a-z]/.test(objName)) {
      return;
    }

    // 拼接代码
    const { code, refs } = transformModelCode(modelObj as SchemaObject, refKey, options?.typeMapping);
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
    generateCode(ref);
  }

  return allContextList;
}
