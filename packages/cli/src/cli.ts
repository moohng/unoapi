#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { generateConfigFile, existsConfig } from '@unoapi/core';

const program = new Command();

// init 初始化配置文件
program
  .command('init')
  .option('-u, --openapi-url [openapiUrl]', 'OpenAPI URL 地址')
  .description('初始化UnoAPI配置文件')
  .action(async (options) => {
    if (await existsConfig()) {
      // 让用户确认
      const { isOverwrite } = await inquirer.prompt({
        type: 'confirm',
        name: 'isOverwrite',
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
  .action(() => {
    console.log('更新OpenAPI文档');
  });

// api 生成API代码
program
  .command('api', { isDefault: true })
  .argument('[urls...]', '接口 URL，可以是多个，用空格分隔')
  .description('生成 API 代码')
  .option('-o, --output [output]', '输出目录', 'src/api')
  .option('--func [functionName]', '自定义 API 函数名称')
  .action((urls, options) => {
    console.log('生成API代码');
    console.log('urls:', urls);
    console.log('options:', options);
  });

program.parse(process.argv);
