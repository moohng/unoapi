import { Command } from 'commander';
import { downloadDoc, loadConfig } from '@unoapi/core';
import { createLogger } from '../utils/logger.js';

const consola = createLogger();

export function registerDownloadCommand(program: Command) {
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
        consola.success('下载成功！已保存到：', config.cacheFile);
      } catch {
        consola.fail(new Error(`下载失败，请检查 openapiUrl：${url} 是否正确！`));
        process.exit(1);
      }
    });
}
