import { writeFile } from 'fs/promises';
import { getDefaultCacheFile, loadConfig } from '../config/index.js';

/**
 * 更新 OpenAPI 文档
 */
export async function updateOpenAPIDoc() {
  console.log('更新 OpenAPI 文档');
  const config = await loadConfig();
  const jsonDoc = await (typeof config.openapiUrl === 'function' ?  config.openapiUrl() : fetchDoc(config.openapiUrl));
  console.log('OpenAPI 文档获取成功', jsonDoc);

  const cacheFile = config.cacheFile || getDefaultCacheFile(typeof config.output === 'string' ? config.output : config.output?.[0]);
  await writeFile(cacheFile, JSON.stringify(jsonDoc, null, 2));
  console.log('文档缓存成功', cacheFile);
}

async function fetchDoc(url: string) {
  const res = await fetch(url);
  return await res.json();
}