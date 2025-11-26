#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { registerInitCommand } from './commands/init.js';
import { registerDownloadCommand } from './commands/download.js';
import { registerApiCommand } from './commands/api.js';

const program = new Command();
program
  .name('uno')
  .description('前端「接口层」代码生成工具')
  .helpOption('-h, --help', '帮助')
  .version(version, '-v, --version', '版本号');

// Register all commands
registerInitCommand(program);
registerDownloadCommand(program);
registerApiCommand(program);

program.parse(process.argv);
