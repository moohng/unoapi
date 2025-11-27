import * as path from 'path';
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import {
  loadConfig,
  generateCode,
  generateSingleApiCode,
  searchApi,
  loadDoc,
  downloadDoc,
  filterApi,
  writeApiFile,
  writeModelFile,
  ApiOperationObject,
  GenerateApi,
  OpenAPIObject,
} from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

interface CliApiOptions {
  openapiUrl?: string;
  output?: string;
  func?: string;
  onlyModel?: boolean;
  globalModel?: boolean;
  all?: boolean;
}

export function registerApiCommand(program: Command) {
  program
    .command('api', { isDefault: true })
    .argument('[urls...]', '接口 URL，可以是多个，用空格分隔')
    .description('生成 API 代码')
    .option('-u, --openapi-url <openapiUrl>', 'OpenAPI JSON 文档地址')
    .option('-o, --output <output>', '输出目录，默认 src/api')
    .option('--func <funcName>', '自定义 API 函数名称')
    .option('--only-model', '只生成 model 代码')
    .option('--global-model', '生成 model 类型在全局声明')
    .option('--all', '生成所有接口的代码')
    .action(async (urls: (string | ApiOperationObject)[], options: CliApiOptions) => {
      const config = await loadConfig();

      let doc: OpenAPIObject;

      if (options.openapiUrl) {
        try {
          consola.start('下载远程文档...', options.openapiUrl);
          doc = await downloadDoc(options.openapiUrl);
          consola.success('下载成功！');
        } catch {
          consola.fail(new Error(`下载 OpenAPI JSON 文档失败，请检查 openapiUrl：${options.openapiUrl} 是否正确！`));
          process.exit(1);
        }
      } else {
        try {
          doc = loadDoc(config.cacheFile);
          consola.success('已从本地缓存加载文档', config.cacheFile);
        } catch {
          if (config.openapiUrl) {
            try {
              consola.start('下载远程文档...', config.openapiUrl);
              doc = await downloadDoc(config.openapiUrl);
              consola.success('下载成功！');
            } catch {
              consola.fail(new Error(`未找到 OpenAPI JSON 文档，请检查配置文件中的 openapiUrl：${config.openapiUrl} 是否正确！`));
              process.exit(1);
            }
          } else {
            consola.fail('请使用 -u 参数提供一个 openapiUrl 地址，或先运行 uno init 生成配置文件！');
            process.exit(1);
          }
        }
      }

      if (options.all) {
        // 生成所有接口的代码
        urls = searchApi(doc);
        consola.info('生成所有接口');
      } else if (urls?.length === 0) {
        // 让用户选择
        const selectedUrl = await inquirer.search<ApiOperationObject>({
          message: '使用关键字搜索接口：',
          source: async (term) => {
            const apis = searchApi(doc, term);
            return apis.map(api => {
              const methodStr = `[${api.method.toUpperCase()}]`;
              return {
                value: api,
                name: `${methodStr.padEnd(9)}${api.path} ${[api.summary, api.description].filter(Boolean).join(' - ')}`,
              };
            });
          },
          pageSize: 10,
        });

        urls = [selectedUrl];
      }

      if (typeof urls[0] === 'string') {
        urls = filterApi(doc, urls as string[]);
      }

      consola.start('生成接口代码...');

      let genApis: GenerateApi[] = [];
      if (urls.length === 1) {
        if (!options.func && !options.onlyModel) {
          // 让用户输入一个函数名称
          const funcName = await inquirer.input({
            message: '请输入函数名称（可选）：',
          });
          options.func = funcName;
        }
        genApis.push(generateSingleApiCode(urls[0] as ApiOperationObject, {
          funcName: options.func,
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
        }));
      } else {
        genApis = generateCode(urls as ApiOperationObject[], {
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
        });
      }

      try {
        let modelCount = 0;
        for (const genApi of genApis) {
          const baseApiOutput = options.output || config.output;
          if (!options.onlyModel) {
            await writeApiFile(genApi, { base: baseApiOutput, imports: config.imports });
            consola.success('生成 api：  ', path.join(baseApiOutput, genApi.filePath));
          }

          if (doc.components?.schemas) {
            const genModels = genApi.getModels(doc.components.schemas);

            let baseModelOutput = options.output || config.modelOutput;
            if (!options.onlyModel && baseApiOutput === baseModelOutput) {
              baseModelOutput = path.join(baseModelOutput, genApi.fileDir, 'model');
            } else {
              baseModelOutput = path.join(baseModelOutput, genApi.fileDir);
            }

            await writeModelFile(genModels, {
              base: baseModelOutput,
              asGlobalModel: options.globalModel ?? config.asGlobalModel,
            });

            modelCount += genModels.length;

            genModels.forEach(m => {
              consola.success('生成 model：', path.join(baseModelOutput, m.filePath));
            });
          }
        }

        consola.success(`本次生成 api: ${genApis.length} 个， model: ${modelCount} 个`);
      } catch (error) {
        consola.error(new Error('代码生成失败！'));
        consola.error(error);
        process.exit(1);
      }
    });
}
