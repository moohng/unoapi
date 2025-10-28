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
export async function updateDoc(input: OpenApiInput, output?: string) {
  console.log('更新 OpenAPI 文档');

  const jsonDoc = await (typeof input === 'function' ? input() : fetchDoc(input));
  console.log('OpenAPI 文档获取成功');

  if (output) {
    try {
      await writeToFile(output, JSON.stringify(jsonDoc, null, 2));
      console.log('文档缓存成功', output);
    } catch (error) {
      console.error('文档缓存失败：', error);
      throw error;
    }
  }

  return jsonDoc as OpenAPIObject;
}

async function fetchDoc(url: string) {
  const res = await fetch(url);
  const resJson = await res.json();
  if (!res.ok) {
    throw new Error(`无法获取 OpenAPI 文档：${res.status} ${res.statusText}，${resJson.message}`);
  }
  return resJson;
}

/**
 * 加载 OpenAPI 文档
 * @param cacheFile 缓存文件路径
 * @returns OpenAPI 文档对象
 */
export function loadDoc(cacheFile: string) {
  try {
    const doc = require(cacheFile) as OpenAPIObject;
    return doc;
  } catch (error) {
    console.error('加载 OpenAPI 文档失败，检查缓存文件是否存在', cacheFile);
    throw error;
  }
}

/**
 * 搜索 API 接口
 * @param keywords 关键词
 * @returns
 */
export async function searchApi(doc: OpenAPIObject, keywords?: string) {
  const result: ApiOperationObject[] = [];
  for (const path in doc.paths) {
    for (const method in doc.paths[path]) {
      const operation = (doc.paths[path] as any)[method];
      result.push({
        ...operation,
        path,
        method,
      });
    }
  }

  if (!keywords) {
    return result;
  }

  return result.filter(
    (item) =>
      item.path.includes(keywords) ||
      item.summary?.includes(keywords) ||
      item.description?.includes(keywords) ||
      item.tags?.some((tag) => tag.includes(keywords))
  );
}
