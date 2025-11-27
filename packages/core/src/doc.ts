import { OpenApiInput } from './config.js';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { ApiOperationObject } from './transform.js';
import { writeToFile } from './write.js';

/**
 * 更新 OpenAPI 文档
 * @param input OpenAPI 文档 URL 或获取函数
 * @param output 缓存文件路径
 * @returns OpenAPI 文档对象
 */
export async function downloadDoc(input: OpenApiInput, output?: string) {
  const jsonDoc = await (typeof input === 'function' ? input() : fetchDoc(input));
  if (output) {
    try {
      await writeToFile(output, JSON.stringify(jsonDoc, null, 2));
    } catch {
      throw new Error('文档缓存失败！');
    }
  }

  return jsonDoc as OpenAPIObject;
}

async function fetchDoc(url: string) {
  const res = await fetch(url);
  const resJson = await res.json() as any;
  if (!res.ok) {
    throw new Error(`无法获取 OpenAPI 文档：${res.status} ${res.statusText}，${resJson.message}`);
  }
  return resJson;
}

/**
 * 加载 OpenAPI 文档
 * @param cacheFile 缓存文件路径
 * @returns 文档对象
 */
export function loadDoc(cacheFile: string) {
  try {
    delete require.cache[require.resolve(cacheFile)];
    const doc = require(cacheFile) as OpenAPIObject;
    return doc;
  } catch {
    throw new Error(`加载 OpenAPI 文档失败，检查缓存文件 ${cacheFile} 是否存在`);
  }
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
  return apis.filter((item) => urls.includes(item.path));
}