import { SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject } from './parse.js';
import { TypeFieldOption, UnoContext } from '../types.js';

/**
 * 生成类型字段代码
 * @param obj
 * @returns
 */
export async function transformTypeFieldCode(obj: TypeFieldOption | string, receiveRefHandler?: (ref: string) => void) {
  if (typeof obj === 'string') {
    obj = { name: obj, required: true } as TypeFieldOption;
  }
  const tsType = await parseSchemaObject(obj.schema, receiveRefHandler);
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

  return codeStr;
}

/**
 * 通过字段描述生成类型接口代码
 * @param params 
 * @param name 
 * @returns 
 */
export async function transformTypeInterfaceCode(params: TypeFieldOption[], name: string, receiveRefHandler?: (ref: string) => void) {
  let codeStr = (await Promise.all(params.map(param => {
    return transformTypeFieldCode(param, receiveRefHandler);
  }))).join('\n');
  codeStr = `export default interface ${name} {\n${codeStr}\n}\n`;
  return codeStr;
}

/**
 * 输出 api 函数代码
 * @param apiContext
 * @returns
 */
export async function transformApiCode(apiContext: UnoContext) {
  const { queryType, bodyType, responseType, comment, name, url, method, pathParams } = apiContext;
  let paramStr = bodyType || queryType ? `data: ${bodyType || queryType}` : '';
  let urlStr = `'${url}'`;
  if (pathParams?.length) {
    let codeStr = (await Promise.all(pathParams.map(item => transformTypeFieldCode(item)))).join(' ');
    paramStr = `params: { ${codeStr} }${paramStr ? (', ' + paramStr) : ''}`;
    // 转换 url
    const paramUrl = url.replace(/\{(.*?)\}/g, (_, $1) => `\${params.${$1}}`);
    urlStr = `\`${paramUrl}\``;
  }
  const resStr = responseType?.includes('List<') ? `${responseType.match(/List<(.*)>/)![1]}[]` : responseType;
  let apiFuncStr = `
export function ${name}(${paramStr}) {
  return request<${resStr}>({ url: ${urlStr},${bodyType || queryType ? ' data,' : ''} method: '${method.toUpperCase()}' });
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
