import { getCacheFile, OpenApiInput } from './config.js';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { writeToFile } from './write.js';
import { ApiOperationObject } from './types.js';
import { isDirectory, pathToAbsolute } from './tools.js';

/**
 * 下载 OpenAPI 文档
 * @param openapiUrl OpenAPI 文档 URL
 * @param output 缓存文件路径
 * @returns 缓存文件路径
 */
export async function downloadDoc(openapiUrl: string, output?: string) {
  const doc = await fetchDoc(openapiUrl);
  output = output ? (await isDirectory(output) ? getCacheFile(output) : output) : getCacheFile();
  try {
    await writeToFile(output, JSON.stringify(doc, null, 2));
    return output;
  } catch {
    throw new Error('文档缓存失败！');
  }
}

/**
 * 获取 OpenAPI 文档
 * @param openapiUrl OpenAPI 文档 URL
 * @returns OpenAPI 文档对象
 */
async function fetchDoc(openapiUrl: string) {
  try {
    const res = await fetch(openapiUrl);
    const resJson = await res.json() as OpenAPIObject;
    if (!res.ok) {
      throw new Error(`无法获取 OpenAPI 文档：${res.status} ${res.statusText}`);
    }
    return resJson;
  } catch {
    throw new Error(`无法获取 OpenAPI 文档：${openapiUrl}`);
  }
}

/**
 * 加载 OpenAPI 文档
 * @param input OpenAPI 文档 URL 或本地文件路径
 * @returns OpenAPI 文档对象
 */
export async function loadDoc(input: OpenApiInput) {
  if (typeof input === 'string') {
    if (/https?:\/\//.test(input)) {
      return fetchDoc(input);
    }
    try {
      input = pathToAbsolute(input);
      delete require.cache[require.resolve(input)];
      const doc = require(input) as OpenAPIObject;
      return doc;
    } catch {
      throw new Error(`加载 OpenAPI 文档失败，检查文件 ${input} 是否存在`);
    }
  }

  return input();
}

/**
 * 搜索 API 接口
 * @param keywords 关键词
 * @returns
 */
export function searchApi(doc: OpenAPIObject, keywords?: string) {
  const result: ApiOperationObject[] = [];

  const isMatched = (item: ApiOperationObject, term: string) => {
    return item.path.includes(term) ||
      item.summary?.includes(term) ||
      item.description?.includes(term) ||
      item.tags?.some((tag) => tag.includes(term));
  }

  for (const path in doc.paths) {
    for (const method in doc.paths[path]) {
      const itemObj: ApiOperationObject = {
        ...(doc.paths[path] as any)[method],
        path,
        method,
      };
      if (!keywords || isMatched(itemObj, keywords)) {
        result.push(itemObj);
      }
    }
  }

  return result;
}

/**
 * 过滤 API 接口
 * @param urls URL 列表
 * @returns
 */
export function filterApi(doc: OpenAPIObject, urls: string[]) {
  const apis = searchApi(doc);
  return apis.filter((item) => urls.some(url => item.path === url.replace(/^\/?/, '/')));
}