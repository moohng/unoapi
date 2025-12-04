import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import {
  loadConfig,
  generateCode,
  generateSingleApiCode,
  loadDoc,
  searchApi,
  autoWriteAll,
} from '@unoapi/core';
import type { ApiOperationObject, GenerateApi, OpenAPIObject } from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

interface CliApiOptions {
  input?: string;
  output?: string;
  funcName?: string;
  onlyModel?: boolean;
  globalModel?: boolean;
  all?: boolean;
}

export function registerApiCommand(program: Command) {
  program
    .command('api', { isDefault: true })
    .alias('gen')
    .argument('[input]', 'OpenAPI JSON 文档本地或远程地址')
    .argument('[output]', '指定输出目录或文件，会忽略从 url 中解析的目录结构')
    .description('生成 API 代码')
    .option('-i, --input <input>', 'OpenAPI JSON 文档本地或远程地址')
    .option('-o, --output <output>', '指定输出目录或文件，会忽略从 url 中解析的目录结构')
    .option('-n, --func-name <funcName>', '自定义 API 函数名称，生成单个 API 函数时生效')
    .option('-m, --only-model', '只生成 model 代码')
    .option('-a, --all', '生成所有接口的代码')
    .action(async (openapiURI?: string, output?: string, options?: CliApiOptions) => {
      const config = await loadConfig();
      let doc: OpenAPIObject;

      // 优先使用命令行参数
      const input = openapiURI || options?.input || config.input;
      if (input) {
        try {
          consola.start('加载文档...', input);
          doc = await loadDoc(input);
          consola.success('加载成功！');
        } catch {
          consola.fail(new Error(`加载文档失败，请检查参数 input：${input} 是否正确！`));
          process.exit(1);
        }
      } else {
        if (config.cacheFile) {
          try {
            consola.start('从默认缓存文件加载文档...', config.cacheFile);
            doc = await loadDoc(config.cacheFile);
            consola.success('加载成功！');
          } catch {
            consola.fail(new Error(`未找到 OpenAPI JSON 文档，请检查配置文件中的 input：${config.input} 是否正确！`));
            process.exit(1);
          }
        } else {
          consola.fail('请使用 -i 参数提供一个文档地址，或先运行 uno init 生成配置文件！');
          process.exit(1);
        }
      }

      let apis: ApiOperationObject[] = [];
      if (options.all) {
        // 生成所有接口的代码
        apis = searchApi(doc);
        consola.info('生成所有接口');
      } else {
        // 让用户选择
        const selectedUrl = await inquirer.search<ApiOperationObject>({
          message: '使用关键字搜索接口：',
          source: async (term) => {
            const apis = searchApi(doc, term);
            return apis.map(api => {
              const methodStr = `[${api.method.toUpperCase()}]`;
              return {
                value: api,
                name: `${methodStr.padEnd(9)}${api.path} ${api.summary?.slice(0, 20)}`,
              };
            });
          },
          pageSize: 10,
        });

        apis = [selectedUrl];
      }

      if (!apis.length) {
        consola.warn('未找到接口');
        process.exit(0);
      }

      consola.start('生成接口代码...');

      let genApis: GenerateApi[] = [];
      if (apis.length === 1) {
        if (!options.funcName && !options.onlyModel) {
          // 让用户输入一个函数名称
          const funcName = await inquirer.input({
            message: '请输入函数名称（可选）：',
          });
          options.funcName = funcName;
        }
        genApis.push(generateSingleApiCode(apis[0], {
          funcName: options.funcName,
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
          ignores: config.ignores,
        }));
      } else {
        genApis = generateCode(apis, {
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
          ignores: config.ignores,
        });
      }

      // 写入文件

      try {
        // 覆盖配置文件中的 output
        const overrideOutput = output || options.output;
        const { apiCount, modelCount } = await autoWriteAll(genApis, {
          apiOutput: overrideOutput || config.output,
          modelOutput: config.modelOutput,
          isOverride: !!overrideOutput,
          onlyModel: options.onlyModel ?? config.onlyModel,
          schemas: doc.components?.schemas,
          imports: config.imports,
          writedCallback: (type, filePath) => {
            consola.success(`生成 ${type}：  ${filePath}`);
          },
        });

        consola.success(`本次生成 api: ${apiCount} 个， model: ${modelCount} 个`);
      } catch (error) {
        consola.error(new Error('代码生成失败！'));
        consola.error(error);
        process.exit(1);
      }
    });
}
