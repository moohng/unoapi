import { OperationObject, ParameterObject, SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject } from './parse.js';

export type HTTPMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

/**
 * Api 代码上下文
 */
export interface ApiCodeContext {
  api: ApiOperationObject;
  /** 默认取URL最后一段 */
  name: string;
  url: string;
  method: HTTPMethod;
  comment?: string;
  pathParams?: TypeFieldOption[];
  queryType?: string;
  bodyType?: string;
  responseType?: string;
}

/**
 * 类型字段选项
 */
export type TypeFieldOption = Omit<ParameterObject, 'in'>;

/**
 * 解析后的 API 操作对象
 */
export interface ApiOperationObject extends OperationObject {
  path: string;
  method: HTTPMethod;
}

/**
 * 生成类型字段代码
 * @param obj
 * @returns
 */
export async function transformTypeFieldCode(obj: TypeFieldOption | string) {
  if (typeof obj === 'string') {
    obj = { name: obj, required: true } as TypeFieldOption;
  }
  const { type: tsType, refs } = await parseSchemaObject(obj.schema);
  let codeStr = `  ${obj.name.replace(/\W/g, '')}${obj.required ? '' : '?'}: ${tsType};`;

  const descriptionComment = obj.description ? ` ${obj.description} ` : '';
  const minLength = (obj.schema as SchemaObject)?.minLength;
  const maxLength = (obj.schema as SchemaObject)?.maxLength;
  const minComment = minLength ? ` 最小长度：${minLength} ` : '';
  const maxComment = maxLength != null ? ` 最大长度：${maxLength} ` : '';
  if (descriptionComment || minComment || maxComment) {
    const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
    codeStr = `${comment}\n${codeStr}`;
  }

  return { code: codeStr, refs: refs };
}

/**
 * 通过字段描述生成类型接口代码
 * @param params
 * @param name
 * @returns
 */
export async function transformTypeInterfaceCode(params: TypeFieldOption[], name: string) {
  const codes: string[] = [];
  const allRefs: string[] = [];
  for (const param of params) {
    const { code, refs } = await transformTypeFieldCode(param);
    codes.push(code);
    allRefs.push(...refs);
  }
  let codeStr = codes.join('\n');
  codeStr = `export default interface ${name} {\n${codeStr}\n}\n`;
  return { code: codeStr, refs: allRefs };
}

/**
 * 输出 api 函数代码
 * @param apiContext
 * @returns
 */
export async function transformApiCode(apiContext: ApiCodeContext) {
  const { queryType, bodyType, responseType, comment, name, url, method, pathParams } = apiContext;

  let paramStr = bodyType || queryType ? `data: ${bodyType || queryType}` : '';
  let urlStr = `'${url}'`;
  if (pathParams?.length) {
    let codeStr = (await Promise.all(pathParams.map((item) => transformTypeFieldCode(item))))
      .map((item) => item.code.trim())
      .join(' ');
    paramStr = `params: { ${codeStr} }${paramStr ? ', ' + paramStr : ''}`;
    // 转换 url
    const paramUrl = url.replace(/\{(.*?)\}/g, (_, $1) => `\${params.${$1}}`);
    urlStr = `\`${paramUrl}\``;
  }

  const resStr = responseType ? `<${responseType}>` : '';

  let apiFuncStr = `
export function ${name}(${paramStr}) {
  return request${resStr}({ url: ${urlStr},${bodyType || queryType ? ' data,' : ''} method: '${method.toUpperCase()}' });
}
`;

  if (comment) {
    apiFuncStr =
      `
/**
 * ${comment}
 * @UNOAPI[${method}:${url}]
 */` + apiFuncStr;
  } else {
    apiFuncStr =
      `
/**
 * @UNOAPI[${method}:${url}]
 */` + apiFuncStr;
  }

  return apiFuncStr;
}

export interface ImportTypeItem {
  typeName: string;
  path: string;
}

/**
 * 生成类型索引代码
 * @param imports
 * @returns
 */
export function transformTypeIndexCode(imports: ImportTypeItem[]) {
  let importStr = '';
  let typeStr = 'declare global {\n';
  for (const item of imports) {
    importStr += `import _${item.typeName} from '${item.path}';\n`;
    typeStr += `  type ${item.typeName} = _${item.typeName};\n`;
  }
  typeStr += '}\n';

  return importStr + '\n' + typeStr;
}