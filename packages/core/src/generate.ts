import * as path from 'path';
import { ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject, parseUrl } from './parse.js';
import { formatObjName, upperFirst } from './tools.js';
import {
  transformTypeInterfaceCode,
  transformApiCode,
  ApiOperationObject,
  TypeFieldOption,
  ApiCodeContext,
} from './transform.js';
import { loadDoc, searchApi } from './doc.js';
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
export async function generateCode(urls: (string | ApiOperationObject)[], options?: GenerateOptions) {
  const doc = await loadDoc();
  const apis = await searchApi(doc);

  const results: Promise<GenerateCodeContext[]>[] = [];
  if (urls.length === 0) {
    // 生成所有
    for (const item of apis) {
      results.push(generateSingleApiCode(item, options));
    }
  } else {
    for (const url of urls) {
      if ((url as ApiOperationObject).path) {
        results.push(generateSingleApiCode(url as ApiOperationObject, options));
        continue;
      }
      const matched = apis.filter((item) => item.path === url);
      if (matched.length) {
        for (const item of matched) {
          results.push(generateSingleApiCode(item, options));
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
export async function generateSingleApiCode(parsedApi: ApiOperationObject, options?: GenerateSingleOptions) {
  console.log(`生成单个API代码：[${parsedApi.method}]${parsedApi.path}`);

  const { funcName: urlFuncName, fileName: fileNameWithoutExt, dirName, pathStrParams } = parseUrl(parsedApi.path);

  // 函数名称
  const defaultFuncName = parsedApi.operationId?.split(/[\s-_]/).pop() || urlFuncName;
  const funcName = options?.funcName || defaultFuncName;

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
    const { type, refs } = await parseSchemaObject(schema);
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
      const { code, refs } = await transformTypeInterfaceCode(queryParams, queryTypeName);
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
  let responseTypeName = 'any';
  for (const key in parsedApi.responses) {
    if (key.startsWith('2')) {
      const resp = parsedApi.responses[key] as ResponseObject;
      if (resp.content) {
        const mediaType = Object.keys(resp.content)[0];
        const schema = resp.content[mediaType].schema;
        if (schema) {
          const { type, refs } = await parseSchemaObject(schema);
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
  const fileDir = path.join(dirName || '', 'model');
  const results = await generateModelCode([...apiRefs]);
  for (const codeContext of results || []) {
    const filePath = path.join(fileDir, codeContext.fileFullName);
    generateCodeContextList.push({
      ...codeContext,
      sourceType: 'model',
      fileDir,
      filePath,
    });
  }

  return generateCodeContextList;
}

/**
 * 生成模型代码
 * @param refs 模型引用列表
 * @returns
 */
async function generateModelCode(refs: string[]): Promise<GenerateCodeContext[]> {
  const doc = await loadDoc();

  const allRefsSet = new Set<string>(refs);
  const allContextList: GenerateCodeContext[] = [];

  async function generateCode(ref: string) {
    let refKey = ref.replace('#/components/schemas/', '');
    let modelObj: SchemaObject | ReferenceObject | undefined;
    modelObj = doc.components?.schemas?.[refKey];
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
    const { required, properties, description: objDesc } = modelObj as SchemaObject;
    if (!objName || !properties || /^[a-z]/.test(objName)) {
      return;
    }

    // 拼接代码
    let codeStr = `export default interface ${objName} {\n  // @UNOAPI[${refKey}]\n`;
    if (objDesc) {
      codeStr = `/** ${objDesc} */\n${codeStr}`;
    }

    // 外部引用类型
    const importRefKeys = new Set<string>();

    // 遍历属性
    for (const propKey in properties) {
      // 定义属性
      const property = properties[propKey];

      let { type: tsType, refs: subRefs } = await parseSchemaObject(property);
      for (const subRef of subRefs) {
        allRefsSet.add(subRef);
        importRefKeys.add(subRef.replace('#/components/schemas/', ''));
      }

      const isRequired = required?.includes(propKey);
      // 过滤掉一些非法字符 如：key[]
      let propStr = `  ${propKey.replace(/\W/g, '')}${isRequired ? '' : '?'}: ${tsType};\n`;

      // 添加注释
      const { description, minLength, maxLength } = property as SchemaObject;
      const descriptionComment = description ? ` ${description} ` : '';
      const minComment = minLength ? ` 最小长度：${minLength} ` : '';
      const maxComment = maxLength ? ` 最大长度：${maxLength} ` : '';
      if (descriptionComment || minComment || maxComment) {
        const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
        propStr = `${comment}\n${propStr}`;
      }

      // 拼接属性
      codeStr += propStr;
    }

    codeStr += '}\n';

    // 导入外部类型
    let importStr = '';
    for (const importRefKey of importRefKeys) {
      const importType = formatObjName(importRefKey);
      if (refKey !== importRefKey) {
        importStr = `${importStr}import ${importType} from './${importType}';\n`;
      }
    }
    if (importStr) {
      codeStr = `${importStr}\n${codeStr}`;
    }

    const fileFullName = `${objName}.ts`;

    allContextList.push({
      sourceType: 'model',
      sourceCode: codeStr,
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
