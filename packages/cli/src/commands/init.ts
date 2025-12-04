import { Command } from 'commander';
import * as inquirer from '@inquirer/prompts';
import { generateConfigFile, existsConfig, UnoConfigType } from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .alias('i')
    .argument('[openapiUrl]', 'OpenAPI JSON 文档地址')
    .description('初始化 UnoAPI 配置文件')
    .action(async (openapiUrl: string) => {
      // 输入地址
      if (!openapiUrl) {
        openapiUrl = await inquirer.input({
          message: 'OpenAPI JSON 文档地址：',
          required: true,
        });
      }

      // 选择配置风格
      const configType = await inquirer.select<UnoConfigType>({
        message: '选择一种配置风格：',
        choices: [
          { name: 'package.json 中', value: UnoConfigType.PACKAGE },
          { name: 'JavaScript 风格', value: UnoConfigType.JS },
          { name: 'TypeScript 风格', value: UnoConfigType.TS },
        ],
        default: UnoConfigType.PACKAGE,
      });

      if (await existsConfig(configType)) {
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
        const configFile = await generateConfigFile(openapiUrl, configType);
        consola.success('配置文件创建成功：', configFile);
      } catch {
        consola.error(new Error('配置文件创建失败！'));
        process.exit(1);
      }
    });
}
