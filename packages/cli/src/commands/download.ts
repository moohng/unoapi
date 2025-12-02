import { Command } from 'commander';
import { downloadDoc } from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

export function registerDownloadCommand(program: Command) {
  program
    .command('download')
    .argument('<openapiUrl>', 'OpenAPI JSON 在线文档地址')
    .argument('[output]', '输出文件路径')
    .option('-o, --output [output]', '输出文件路径')
    .description('下载 OpenAPI 文档')
    .action(async (openapiUrl: string, output?: string, options: { output?: string } = {}) => {
      try {
        consola.start('正在下载 OpenAPI 文档...');
        const path = await downloadDoc(openapiUrl, output || options.output);
        consola.success('下载成功！已保存到：', path);
      } catch {
        consola.fail(new Error(`下载失败，请检查 openapiUrl：${openapiUrl} 是否正确！`));
        process.exit(1);
      }
    });
}
