import { UnoAPIContext } from "../config";
import { transformTypeFieldCode } from "./transform";

/**
 * 输出 api 函数代码
 * @param apiContext
 * @returns
 */
export function printDefaultApi(apiContext: UnoAPIContext) {
  const { inType, outType, comment, name, url, method, pathParams } = apiContext;
  let paramStr = inType ? `data: ${inType}` : '';
  let urlStr = `'${url}'`;
  if (pathParams?.length) {
    let codeStr = pathParams!.map(transformTypeFieldCode).join('\n');
    paramStr = `params: {\n${codeStr}\n}`;
    // 转换 url
    const paramUrl = url.replace(/\{(.*?)\}/g, (_, $1) => `\${params.${$1}\}`);
    urlStr = `\`${paramUrl}\``;
  }
  const resStr = outType?.includes('List<') ? `${outType.match(/List<(.*)>/)![1]}[]` : outType;
  let apiFuncStr = `
export function ${name}(${paramStr}) {
  return request<${resStr}>({ url: ${urlStr},${inType ? ' data,' : ''} method: '${method.toUpperCase()}' });
}
`;
  if (comment) {
    apiFuncStr =
      `
/**
 * ${comment}
 * @NOAPI[${method}:${url}]
 */` + apiFuncStr;
  } else {
    apiFuncStr =
      `
/**
 * @NOAPI[${method}:${url}]
 */` + apiFuncStr;
  }
  return apiFuncStr;
}
