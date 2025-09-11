#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

// init 初始化配置文件
program
  .command('init [url]')
  .description('初始化UnoAPI配置文件')
  .action((openApiUrl) => {
    console.log('生成配置文件 unoapi.config.js');
    console.log('openApiUrl:', openApiUrl);
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
