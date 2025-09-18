import * as fs from 'fs/promises';

/**
 * OpenAPI JSON 文档
 */
interface OpenAPIJsonDoc {
  openapi: string;
}

/**
 * UnoAPI 上下文
 */
interface UnoAPIContext {

}

/**
 * UnoAPI 配置项
 */
interface UnoAPIConfig {
  /**
   * OpenAPI URL 地址，可以是字符串或返回字符串的函数
   */
  openapiUrl: string | (() => Promise<OpenAPIJsonDoc> | OpenAPIJsonDoc);
  output?: string | [string, string];
  cacheFile?: string;
  typeMapping?: string[][];
  funcTpl?: (context: UnoAPIContext) => string;
}

/**
 * 定义 UnoAPI 配置
 * @param config
 * @returns 
 */
export async function defineUnoAPIConfig(config: UnoAPIConfig | (() => UnoAPIConfig | Promise<UnoAPIConfig>)) {
  if (typeof config === 'function') {
    return await config();
  }
  return config;
}

const CONFIG_PATH = process.cwd() + '/unoapi.config.ts';

/**
 * 生成配置文件
 * @param url OpenAPI URL 地址
 */
export async function generateConfigFile(url?: string) {
  const tpl = await fs.readFile(__dirname + '/tpl.ts', 'utf-8');
  const configContent = tpl.replace('${openapiUrl}', url || 'https://api.example.com/openapi.json');
  // 在项目根目录生成 unoapi.config.ts
  await fs.writeFile(CONFIG_PATH, configContent, 'utf-8');
}

/**
 * 加载配置文件
 * @returns
 */
export async function loadConfig() {
  return import(CONFIG_PATH).then(mod => mod.default || mod);
}

/**
 * 检查配置文件是否存在
 * @returns
 */
export async function existsConfig() {
  return fs.access(CONFIG_PATH).then(() => true).catch(() => false);
}
