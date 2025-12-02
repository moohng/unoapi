import * as fs from 'fs/promises';
import * as path from 'path';
import { build } from 'esbuild';
import Module from 'module';
import { existsPath } from './tools.js';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { ApiContext } from './types.js';

export type OpenApiInput = string | (() => Promise<OpenAPIObject> | OpenAPIObject);

/**
 * UnoAPI 配置项
 */
export interface UnoUserConfig {
  /**
   * OpenAPI 文档的 URL 地址或本地路径，可以是字符串或返回字符串的函数
   */
  input?: OpenApiInput;
  /**
   * 输出目录，默认 src/api；数组表示models输出目录
   */
  output?: string | [string, string];
  /**
   * 自定义类型映射
   */
  typeMapping?: Record<string, string>;
  /**
   * 自定义 api 函数
   */
  funcTpl?: FuncTplCallback;
  /**
   * 只生成 model 代码
   */
  onlyModel?: boolean;
  /**
   * api 函数的头部导入代码
   */
  imports?: string | string[];
  /**
   * 忽略的 model 名称（如：ResponseDTO）、url
   * 全匹配
   */
  ignores?: (string | RegExp)[];
}

/**
 * 配置类型
 */
export enum UnoConfigType {
  PACKAGE = 1,
  JS,
  TS,
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

/**
 * 获取配置路径
 */
export function getConfigFile(type = UnoConfigType.PACKAGE) {
  let configFileName = 'package.json';
  if (type === UnoConfigType.JS) {
    configFileName = 'unoapi.config.js';
  } else if (type === UnoConfigType.TS) {
    configFileName = 'unoapi.config.ts';
  }
  return path.join(process.cwd(), configFileName);
}

/** 默认输出目录 */
export const DEFAULT_OUTPUT = 'src/api';

/** 默认缓存文件 */
export const DEFAULT_CACHE_FILE = '.unoapi.cache.json';

/**
 * 获取缓存文件路径
 * @param output 输出目录
 * @returns
 */
export function getCacheFile(output?: string) {
  return path.resolve(process.cwd(), output || '', DEFAULT_CACHE_FILE);
}

/**
 * 生成配置文件
 * @param url OpenAPI URL 地址
 */
export async function generateConfigFile(url = 'https://api.example.com/openapi.json', type = UnoConfigType.PACKAGE) {
  const configPath = getConfigFile(type);
  if (type === UnoConfigType.PACKAGE) {
    let packageJson: any = {};
    try {
      const packageContent = await fs.readFile(configPath, 'utf-8');
      packageJson = JSON.parse(packageContent);
    } catch { }
    packageJson.unoapi = {
      input: url,
    };
    await fs.writeFile(configPath, JSON.stringify(packageJson, null, 2));
  } else {
    let configContent = `import { defineUnoConfig } from '@unoapi/core';

export default defineUnoConfig({
  input: '${url}', // 本地或url路径
  // output: 'src/api', // 如需单独指定模型输出目录：['src/api', 'src/models'],
  // typeMapping: { float: number }, // 自定义类型映射优先

  // funcTpl: (context) => { // 自定义 API 函数
  //   // 返回自定义 API 函数的字符串
  //   return 'export function...';
  // },

  // onlyModel: false,
  // imports: ['import request from \'@utils/request\';'],
  // ignores: ['ResponseDTO'],
});
`;
    if (type === UnoConfigType.JS) {
      configContent = configContent.split(/\r?\n/).slice(2).join('\n');
      configContent = configContent.replace('defineUnoConfig(', '').replace(/\}\);/, '};');
    }
    await fs.writeFile(configPath, configContent, 'utf-8');
  }
  return configPath;
}

interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any;
}

/**
 * 加载配置文件（支持 ts-node）
 * @returns
 */
export async function loadConfig(): Promise<UnoConfig> {
  // 从 package.json 中加载配置
  try {
    const packageContent = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
    const packageJson = JSON.parse(packageContent);
    if (packageJson.unoapi && Object.keys(packageJson.unoapi).length > 0) {
      return checkConfig(packageJson.unoapi);
    }
  } catch { }

  // 从配置文件中加载配置
  let filePath = getConfigFile(UnoConfigType.JS);
  if (!await existsPath(filePath)) {
    filePath = getConfigFile(UnoConfigType.TS);
  }

  if (!await existsPath(filePath)) {
    return checkConfig();
  }

  try {
    // 删除缓存
    delete require.cache[require.resolve(filePath)];
    const result = await build({
      entryPoints: [filePath],
      platform: 'node',
      format: 'cjs',
      write: false,
    });

    const module = new Module('unoapi.config.ts') as NodeModuleWithCompile;
    // @ts-ignore
    module.paths = Module._nodeModulePaths(process.cwd());
    module._compile(result.outputFiles[0].text, 'unoapi.config.ts');

    return checkConfig(await module.exports.default || module.exports);
  } catch {
    return checkConfig();
  }
}

/**
 * 检查并处理配置项
 * @param config 配置项
 * @returns
 */
function checkConfig(config?: UnoUserConfig): UnoConfig {
  if (!config) {
    const output = path.join(process.cwd(), DEFAULT_OUTPUT);
    return {
      output,
      modelOutput: output,
      cacheFile: getCacheFile(),
    };
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

  localConfig.cacheFile = getCacheFile();

  if (typeof config.imports === 'string') {
    localConfig.imports = [config.imports];
  }

  return localConfig;
}

/**
 * 检查配置文件是否存在
 * @returns
 */
export async function existsConfig(type: UnoConfigType) {
  const configPath = getConfigFile(type);
  if (type === UnoConfigType.PACKAGE) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const packageJson = JSON.parse(content);
      return !!packageJson.unoapi;
    } catch {
      return false;
    }
  }
  return await existsPath(configPath);
}
