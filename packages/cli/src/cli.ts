#!/usr/bin/env node
import * as path from 'path';
import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import { generateConfigFile, existsConfig, updateOpenAPIDoc, createUnoAPI, loadConfig, appendToFile, writeToFile, writeToIndexFile, searchApi } from '@unoapi/core';

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
    try {
      await updateOpenAPIDoc();
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
    console.log('生成 API 代码', options);
    if (!await existsConfig()) {
      console.error('配置文件不存在，请先运行 unoapi init 命令生成配置文件');
      process.exit(1);
    }

    const config = await loadConfig();
    console.log('配置文件', config);
    const unoapi = await createUnoAPI(config);

    if (options.all) {
      // 生成所有接口的代码
      urls = [];
    } else if (urls?.length === 0) {
      // 让用户选择
      const selectedUrl = await inquirer.search<string>({
        message: '使用关键字搜索接口：',
        source: async (term) => searchApi(term || ''),
        pageSize: 10,
      });
      urls = [selectedUrl];
      // 函数名称
      if (!options.funcName) {
        const funcName = await inquirer.input({
          message: '请输入自定义函数名称（可选）：',
        });
        options.funcName = funcName;
      }
    }

    console.log('urls：', urls);

    try {
      await unoapi
        .api(urls)
        .on(async (codeContext) => {
          if (codeContext.sourceType === 'api') {
            const filePath = path.resolve(options.output || config.output, codeContext.filePath!);
            await appendToFile(filePath, codeContext.sourceCode);
          } else {
            const modelDir = path.resolve(options.output || config.modelOutput, codeContext.fileDir);
            const filePath = path.resolve(modelDir, codeContext.fileName);
            await writeToFile(filePath, codeContext.sourceCode);
            await writeToIndexFile(codeContext.typeName!, path.resolve(modelDir), filePath);
          }
        })
        .start({ funcName: options.funcName, output: options.output });
      process.exit(0);
    } catch (error) {
      console.error('操作失败：', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
