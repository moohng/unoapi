#!/usr/bin/env node
import * as path from 'path';
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import { generateConfigFile, existsConfig, updateDoc, loadConfig, generateCode, generateSingleApiCode, appendToFile, writeToFile, writeToIndexFile, searchApi, loadDoc, ApiOperationObject, GenerateApi } from '@unoapi/core';

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
  .action(async (urls, options) => {
    console.log('开始生成 API 代码...');
    if (!await existsConfig()) {
      console.error('配置文件不存在，请先运行 unoapi init 命令生成配置文件');
      process.exit(1);
    }

    const config = await loadConfig();
    const doc = loadDoc(config.cacheFile);

    if (options.all) {
      // 生成所有接口的代码
      urls = [];
    } else if (urls?.length === 0) {
      // 让用户选择
      const selectedUrl = await inquirer.search<ApiOperationObject>({
        message: '使用关键字搜索接口：',
        source: async (term) => {
          const apis = await searchApi(doc, term);
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
      // 函数名称
      if (!options.func) {
        const funcName = await inquirer.input({
          message: '请输入自定义函数名称（可选）：',
        });
        options.func = funcName;
      }
    }

    try {
      let genApis: GenerateApi[] = [];
      if (urls.length === 1) {
        if (typeof urls[0] === 'string') {
          // 载入文档，查找对应接口
          const apis = await searchApi(doc);
          const matched = apis.filter((item) => item.path === urls[0]);
          if (matched.length === 0) {
            console.error(`未找到匹配的接口：${urls[0]}`);
            process.exit(1);
          }
          urls[0] = matched[0];
        }
        genApis.push(await generateSingleApiCode(urls[0] as ApiOperationObject, {
          funcName: options.func,
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
        }));
      } else {
        genApis = await generateCode(doc, urls, { funcTpl: config.funcTpl, typeMapping: config.typeMapping, });
      }

      for (const genApi of genApis) {
        console.log('写入 api 代码到：', genApi.filePath);
        const filePath = path.resolve(options.output || config.output, genApi.filePath!);
        await appendToFile(filePath, genApi.sourceCode);

        if (doc.components?.schemas) {
          const genModels = await genApi.generateModels(doc.components?.schemas);
          for (const model of genModels) {
            const modelDir = path.resolve(options.output || config.modelOutput, model.fileDir);
            const filePath = path.resolve(modelDir, model.fileFullName);
            console.log('写入 model 代码到：', filePath);
            await writeToFile(filePath, model.sourceCode);
            await writeToIndexFile(model.typeName, path.resolve(modelDir), filePath);
          }
        }
      }
      process.exit(0);
    } catch (error) {
      console.error('操作失败：', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
