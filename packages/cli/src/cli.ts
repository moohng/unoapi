#!/usr/bin/env node
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import { generateConfigFile, existsConfig, updateDoc, loadConfig, generateCode, generateSingleApiCode, searchApi, loadDoc, ApiOperationObject, GenerateApi, filterApi, writeApiFile, writeModelFile } from '@unoapi/core';

const program = new Command();

// init 初始化配置文件
program
  .command('init')
  .option('-u, --openapi-url [openapiUrl]', 'OpenAPI URL 地址')
  .description('初始化 UnoAPI 配置文件')
  .action(async (options) => {
    if (await existsConfig()) {
      // 让用户确认
      const isOverwrite = await inquirer.confirm({
        message: '配置文件已存在，是否覆盖？',
        default: false,
      });
      if (!isOverwrite) {
        console.error('已取消');
        process.exit(1);
      }
    }
    const { openapiUrl } = options;
    try {
      await generateConfigFile(openapiUrl);
      console.log('配置文件创建成功：unoapi.config.ts');
    } catch (error) {
      console.error('配置文件创建失败：', error);
      process.exit(1);
    }
  });

// update 更新 OpenAPI 文档
program
  .command('update')
  .description('更新 OpenAPI 文档')
  .action(async () => {
    if (!await existsConfig()) {
      console.error('配置文件不存在，请先运行 unoapi init 命令生成配置文件');
      process.exit(1);
    }

    const config = await loadConfig();

    try {
      await updateDoc(config.openapiUrl, config.cacheFile);
    } catch (error) {
      console.error('操作失败：', error);
      process.exit(1);
    }
  });

// api 生成API代码
program
  .command('api', { isDefault: true })
  .argument('[urls...]', '接口 URL，可以是多个，用空格分隔')
  .description('生成 API 代码')
  .option('-o, --output <output>', '输出目录')
  .option('--func <funcName>', '自定义 API 函数名称')
  .option('--all', '生成所有接口的代码')
  .action(async (urls: (string | ApiOperationObject)[], options) => {
    console.log('开始生成 API 代码...');
    if (!await existsConfig()) {
      console.error('配置文件不存在，请先运行 unoapi init 命令生成配置文件');
      process.exit(1);
    }

    const config = await loadConfig();
    let doc
    try {
      doc = loadDoc(config.cacheFile);
    } catch {
      console.error('请先运行 uno update 下载文档');
      process.exit(1);
    }

    if (options.all) {
      // 生成所有接口的代码
      urls = [];
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
    
    let genApis: GenerateApi[] = [];
    if (urls.length === 1) {
      if (!options.func) {
        // 让用户输入一个函数名称
        const funcName = await inquirer.input({
          message: '请输入自定义函数名称（可选）：',
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
      for (const genApi of genApis) {
        await writeApiFile(genApi, { base: options.output || config.output, imports: config.imports });

        if (doc.components?.schemas) {
          const genModels = genApi.getModels(doc.components?.schemas);
          
          await writeModelFile(genModels, {
            base: options.output || config.modelOutput,
            asGlobalModel: config.asGlobalModel,
          });
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error('写入文件失败：', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
