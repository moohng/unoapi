import * as fs from 'fs/promises';
import * as path from 'path';
import * as esbuild from 'esbuild';
import { UnoAPIContext } from '../types.js';

/**
 * OpenAPI JSON 文档
 */
interface OpenAPIJsonDoc {
  paths: Record<string, object>;
  components?: [];
}

/**
 * UnoAPI 配置项
 */
export interface UnoAPIConfig {
  /**
   * OpenAPI URL 地址，可以是字符串或返回字符串的函数
   */
  openapiUrl: string | (() => Promise<OpenAPIJsonDoc> | OpenAPIJsonDoc);
  /**
   * 输出目录，默认 src/api；数组表示models输出目录
   */
  output?: string | [string, string];
  /**
   * 缓存文件，默认 [output]/.openapi-cache.json
   */
  cacheFile?: string;
  typeMapping?: string[][];
  funcTpl?: (context: UnoAPIContext) => string | Promise<string> | UnoAPIContext | Promise<UnoAPIContext>;
}

/**
 * 定义 UnoAPI 配置
 * @param config
 * @returns 
 */
export async function defineUnoAPIConfig(config: UnoAPIConfig | (() => UnoAPIConfig | Promise<UnoAPIConfig>)) {
  if (typeof config === 'function') {
    config = await config();
  }
  return checkConfig(config);
}

/**
 * 检查并处理配置项
 * @param config 配置项
 * @returns 
 */
function checkConfig(config: UnoAPIConfig) {
  if (!config.openapiUrl) {
    throw new Error('openapiUrl is required');
  }

  if (typeof config.output === 'string') {
    if (!path.isAbsolute(config.output)) {
      config.output = path.join(process.cwd(), config.output);
    }
  } else if (Array.isArray(config.output)) {
    config.output = config.output.map(dir => {
      if (!path.isAbsolute(dir)) {
        dir = path.join(process.cwd(), dir);
      }
      return dir;
    }) as [string, string];
  }

  if (config.cacheFile) {
    if (!path.isAbsolute(config.cacheFile)) {
      config.cacheFile = path.join(process.cwd(), config.cacheFile);
    }
  }

  return config;
}

/** 配置路径 */
const CONFIG_PATH = process.cwd() + '/unoapi.config.ts';

/** 默认输出目录 */
export const DEFAULT_OUTPUT = 'src/api';

/**
 * 获取默认缓存文件路径
 * @param output 输出目录
 * @returns 
 */
export function getDefaultCacheFile(output = DEFAULT_OUTPUT) {
  if (!path.isAbsolute(output)) {
    output = path.join(process.cwd(), output || DEFAULT_OUTPUT);
  }
  return path.join(output, '.openapi-cache.json');
}

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
 * 加载配置文件（支持 ts-node）
 * @returns
 */
export async function loadConfig(): Promise<UnoAPIConfig> {
  // const tsNode = await import('ts-node');
  // tsNode.register({
  //   transpileOnly: true,
  //   compilerOptions: {
  //     module: 'commonjs'
  //   }
  // });
  const tmpFile = path.resolve('unoapi.config.js');
  await esbuild.build({
    entryPoints: [CONFIG_PATH],
    platform: 'node',
    format: 'cjs',
    outfile: tmpFile,
  });
  const mod = await import(`file://${tmpFile}`);
  fs.rm(tmpFile);
  return mod.default.default || mod;
}

/**
 * 检查配置文件是否存在
 * @returns
 */
export async function existsConfig() {
  return fs.access(CONFIG_PATH).then(() => true).catch(() => false);
}
