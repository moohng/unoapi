import * as fs from 'fs/promises';
import * as path from 'path';
import { build } from 'esbuild';
import Module from 'module';
import { existsPath } from './tools.js';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { ApiContext } from './transform.js';

export type OpenApiInput = string | (() => Promise<OpenAPIObject> | OpenAPIObject);

/**
 * UnoAPI 配置项
 */
export interface UnoUserConfig {
  /**
   * OpenAPI URL 地址，可以是字符串或返回字符串的函数
   */
  openapiUrl: OpenApiInput;
  /**
   * 输出目录，默认 src/api；数组表示models输出目录
   */
  output?: string | [string, string];
  /**
   * 缓存文件，默认 [output]/.openapi-cache.json
   */
  cacheFile?: string;
  /**
   * 自定义类型映射
   */
  typeMapping?: Record<string, string>;
  /**
   * 自定义 api 函数
   */
  funcTpl?: FuncTplCallback;
  /**
   * 是否将model类型写入全局
   */
  asGlobalModel?: boolean;
  /**
   * api 函数的头部导入代码
   */
  imports?: string | string[];
}

export type FuncTplCallback = (context: ApiContext) => string;

export interface UnoConfig extends UnoUserConfig {
  output: string;
  modelOutput: string;
  cacheFile: string;
  imports?: string[];
}

/**
 * 定义 UnoAPI 配置
 * @param config
 * @returns
 */
export async function defineUnoConfig(config: UnoUserConfig | (() => UnoUserConfig | Promise<UnoUserConfig>)) {
  if (typeof config === 'function') {
    config = await config();
  }
  return config;
}

/** 配置路径 */
const CONFIG_PATH = path.join(process.cwd(), 'unoapi.config.ts');

/** 默认输出目录 */
const DEFAULT_OUTPUT = 'src/api';

/**
 * 获取默认缓存文件路径
 * @param output 输出目录
 * @returns
 */
function getDefaultCacheFile(output = DEFAULT_OUTPUT) {
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
  const tpl = await fs.readFile(path.join(__dirname, '/tpl.txt'), 'utf-8');
  const configContent = tpl.replace('${openapiUrl}', url || 'https://api.example.com/openapi.json');
  // 在项目根目录生成 unoapi.config.ts
  await fs.writeFile(CONFIG_PATH, configContent, 'utf-8');
}

interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any;
}

let prevMtime: number = 0;
let cachedConfig: UnoConfig;

/**
 * 加载配置文件（支持 ts-node）
 * @returns
 */
export async function loadConfig(): Promise<UnoConfig> {
  // 判断文件内容是否更改
  const stat = await fs.stat(CONFIG_PATH);
  if (prevMtime === stat.mtimeMs && cachedConfig) {
    return cachedConfig;
  }

  prevMtime = stat.mtimeMs;

  const result = await build({
    entryPoints: [CONFIG_PATH],
    platform: 'node',
    format: 'cjs',
    write: false,
  });

  const module = new Module('unoapi.config.ts') as NodeModuleWithCompile;
  // @ts-ignore
  module.paths = Module._nodeModulePaths(process.cwd());
  module._compile(result.outputFiles[0].text, 'unoapi.config.ts');

  cachedConfig = checkConfig(await module.exports.default);
  return cachedConfig;
}

/**
 * 检查并处理配置项
 * @param config 配置项
 * @returns
 */
function checkConfig(config: UnoUserConfig): UnoConfig {
  if (!config.openapiUrl) {
    throw new Error('openapiUrl is required');
  }

  const localConfig: UnoConfig = { ...config } as UnoConfig;

  if (typeof config.output === 'string') {
    if (!path.isAbsolute(config.output)) {
      localConfig.output = path.join(process.cwd(), config.output);
    }
    localConfig.modelOutput = localConfig.output;
  } else if (Array.isArray(config.output)) {
    config.output = config.output.map((dir) => {
      if (!path.isAbsolute(dir)) {
        dir = path.join(process.cwd(), dir);
      }
      return dir;
    }) as [string, string];
    localConfig.output = config.output[0];
    localConfig.modelOutput = config.output[1];
  } else {
    localConfig.output = path.join(process.cwd(), DEFAULT_OUTPUT);
    localConfig.modelOutput = localConfig.output;
  }

  if (config.cacheFile) {
    if (!path.isAbsolute(config.cacheFile)) {
      localConfig.cacheFile = path.join(process.cwd(), config.cacheFile);
    }
  } else {
    localConfig.cacheFile = getDefaultCacheFile(localConfig.output);
  }

  if (typeof config.imports === 'string') {
    localConfig.imports = [config.imports];
  }

  return localConfig;
}

/**
 * 检查配置文件是否存在
 * @returns
 */
export async function existsConfig() {
  return await existsPath(CONFIG_PATH);
}
