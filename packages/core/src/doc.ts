import * as fs from 'fs/promises';
import { loadConfig } from './config.js';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { ApiOperationObject } from './transform.js';

/**
 * 更新 OpenAPI 文档
 */
export async function updateOpenAPIDoc() {
  console.log('更新 OpenAPI 文档');

  const config = await loadConfig();
  const jsonDoc = await (typeof config.openapiUrl === 'function' ? config.openapiUrl() : fetchDoc(config.openapiUrl));
  console.log('OpenAPI 文档获取成功');

  const cacheFile = config.cacheFile;
  await fs.writeFile(cacheFile, JSON.stringify(jsonDoc, null, 2));
  console.log('文档缓存成功', cacheFile);
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
 * @returns OpenAPI 文档对象
 */
export async function loadDoc() {
  const { cacheFile } = await loadConfig();
  const doc = require(cacheFile) as OpenAPIObject;
  return doc;
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
