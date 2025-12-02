import * as path from 'path';
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import {
  loadConfig,
  generateCode,
  generateSingleApiCode,
  searchApi,
  loadDoc,
  filterApi,
  writeApiToFile,
  writeModelToFile,
  ApiOperationObject,
  GenerateApi,
  OpenAPIObject,
  ImportItem,
  isDirectory,
} from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

interface CliApiOptions {
  input?: string;
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
    .option('-i, --input <input>', 'OpenAPI JSON 文档本地或远程地址')
    .option('-o, --output <output>', '输出目录或文件，默认 src/api')
    .option('--func <funcName>', '自定义 API 函数名称')
    .option('--only-model', '只生成 model 代码')
    .option('--all', '生成所有接口的代码')
    .action(async (urls: (string | ApiOperationObject)[], options: CliApiOptions) => {
      const config = await loadConfig();
      let doc: OpenAPIObject;

      // 优先使用命令行参数
      const input = options.input || config.input;
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
                name: `${methodStr.padEnd(9)}${api.path} ${api.summary?.slice(0, 20)}`,
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

      if (!urls.length) {
        consola.warn('未找到接口');
        process.exit(0);
      }

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
          ignores: config.ignores,
        }));
      } else {
        genApis = generateCode(urls as ApiOperationObject[], {
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
          ignores: config.ignores,
        });
      }

      try {
        let apiCount = 0;
        let modelCount = 0;
        for (const genApi of genApis) {
          const baseApiOutput = options.output || config.output;
          const onlyModel = options.onlyModel ?? config.onlyModel;
          let modelImport: ImportItem | undefined;

          if (doc.components?.schemas) {
            const genModels = genApi.getModels(doc.components.schemas);

            let baseModelOutput = options.output || config.modelOutput;
            if (!await isDirectory(baseModelOutput)) {
              baseModelOutput = path.join(path.dirname(baseModelOutput), 'model');
            }
            if (!onlyModel && baseApiOutput === baseModelOutput) {
              baseModelOutput = path.join(baseModelOutput, genApi.fileDir, 'model');
            } else {
              baseModelOutput = path.join(baseModelOutput, genApi.fileDir);
            }

            const { indexFilePath, fileNames } = await writeModelToFile(genModels, {
              base: baseModelOutput,
            });

            modelCount += genModels.length;

            genModels.forEach(m => {
              consola.success('生成 model：', path.join(baseModelOutput, m.filePath));
            });

            // 计算 model 导入路径
            if (fileNames.length) {
              const genApiPath = await isDirectory(baseApiOutput) ? path.join(baseApiOutput, genApi.fileDir) : path.dirname(baseApiOutput);
              let relativePath = path.relative(genApiPath, path.dirname(indexFilePath));
              relativePath = relativePath.replace(/\\/g, '/');
              if (!relativePath.startsWith('.')) {
                relativePath = `./${relativePath}`;
              }
              modelImport = { path: relativePath, names: fileNames.filter(name => genApi.useModels?.includes(name)), onlyType: true };
            }
          }

          // 写入 api 文件
          if (!onlyModel) {
            const imports: (string | ImportItem)[] = config.imports ? [...config.imports] : [];

            // 计算 model 导入路径
            if (modelImport) {
              imports.push(modelImport);
            }

            await writeApiToFile(genApi, {
              base: baseApiOutput,
              imports,
              filePath: !await isDirectory(baseApiOutput) ? baseApiOutput : undefined,
            });
            consola.success('生成 api：  ', path.join(baseApiOutput, genApi.filePath));
            apiCount++;
          }
        }

        consola.success(`本次生成 api: ${apiCount} 个， model: ${modelCount} 个`);
      } catch (error) {
        consola.error(new Error('代码生成失败！'));
        consola.error(error);
        process.exit(1);
      }
    });
}
