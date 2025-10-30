#!/usr/bin/env node
import * as path from 'path';
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import * as con from 'consola';
import { generateConfigFile, existsConfig, downloadDoc, loadConfig, generateCode, generateSingleApiCode, searchApi, loadDoc, ApiOperationObject, GenerateApi, filterApi, writeApiFile, writeModelFile, OpenAPIObject } from '@unoapi/core';

const program = new Command();

const consola = con.create({
  defaults: {
    message: '[UNOAPI]',
  },
});

// init 初始化配置文件
program
  .command('init')
  .argument('[openapiUrl]', 'OpenAPI JSON 文档地址')
  .description('初始化 UnoAPI 配置文件')
  .action(async (openapiUrl: string) => {
    if (await existsConfig()) {
      // 让用户确认
      const isOverwrite = await inquirer.confirm({
        message: '配置文件已存在，是否覆盖？',
        default: false,
      });
      if (!isOverwrite) {
        consola.fail('操作取消');
        process.exit(0);
      }
    }

    try {
      const configFile = await generateConfigFile(openapiUrl);
      consola.success('配置文件创建成功：', configFile);
    } catch {
      consola.error(new Error('配置文件创建失败'));
      process.exit(1);
    }
  });

// download
program
  .command('download')
  .argument('[openapiUrl]', 'OpenAPI JSON 文档地址')
  .description('下载 OpenAPI 文档')
  .action(async (openapiUrl: string) => {
    const config = await loadConfig();

    if (!openapiUrl && !config.openapiUrl) {
      consola.fail('请提供一个 openapiUrl 地址，或先运行 uno init 生成配置文件');
      process.exit(1);
    }

    const url = openapiUrl || config.openapiUrl;
    try {
      consola.start('正在下载 OpenAPI 文档...');
      await downloadDoc(url, config.cacheFile);
      consola.success('下载成功！');
    } catch {
      consola.error(new Error(`下载失败，请检查 ${url} 是否正确！`));
      process.exit(1);
    }
  });

interface CliApiOptions {
  openapiUrl?: string;
  output?: string;
  func?: string;
  onlyModel?: boolean;
  globalModel?: boolean;
  all?: boolean;
}

// api 生成API代码
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

    let doc: OpenAPIObject

    if (options.openapiUrl) {
      try {
        consola.start('下载远程文档...', options.openapiUrl);
        doc = await downloadDoc(options.openapiUrl);
        consola.success('下载成功！');
      } catch {
        consola.error(new Error(`下载 OpenAPI JSON 文档失败，请检查 ${options.openapiUrl} 是否正确！`));
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
            consola.error(new Error(`未找到 OpenAPI JSON 文档，请检查配置文件中的 ${config.openapiUrl} 是否正确！`));
            process.exit(1);
          }
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
          }); // 显示方法和路径
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
        }

        consola.success('生成 api：  ', path.join(baseApiOutput, genApi.filePath));

        if (doc.components?.schemas) {
          const genModels = genApi.getModels(doc.components.schemas);
          
          let baseModelOutput = options.output || config.modelOutput;
          if (!options.onlyModel && baseApiOutput === baseModelOutput) {
            baseModelOutput = path.join(baseModelOutput, 'model');
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
    } catch {
      consola.error(new Error('代码生成失败！'));
      process.exit(1);
    }
  });

program.parse(process.argv);
