import * as vscode from 'vscode';
import * as path from 'path';
import { checkConfig, existsPath, getConfigFile, UnoConfig, UnoConfigType } from '@unoapi/core';

export interface OutputPaths {
  outputDir: string;
  targetFile?: string;
  isFileTarget: boolean;
}

export async function determineOutputPaths(uri: vscode.Uri | undefined, output: string): Promise<OutputPaths> {
  let outputDir = output;
  let targetFile: string | undefined;
  let isFileTarget = false;

  if (uri) {
    const fsPath = uri.fsPath;
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.Directory) {
      outputDir = fsPath;
    } else {
      // Target is a file - we'll append to it
      targetFile = fsPath;
      isFileTarget = true;
      outputDir = path.dirname(fsPath);
    }
  }

  return { outputDir, targetFile, isFileTarget };
}

/**
 * 加载配置文件（支持 ts-node）
 * @returns
 */
export async function loadConfig(): Promise<UnoConfig> {
  // 从 package.json 中加载配置
  try {
    const data = await vscode.workspace.fs.readFile(vscode.Uri.file(getConfigFile(UnoConfigType.PACKAGE)));
    const packageJson = JSON.parse(Buffer.from(data).toString('utf-8'));
    if (packageJson.unoapi && Object.keys(packageJson.unoapi).length > 0) {
      return checkConfig(packageJson.unoapi);
    }
  } catch { }

  // 从配置文件中加载配置
  const filePath = getConfigFile(UnoConfigType.JS);

  if (await existsPath(filePath)) {
    delete require.cache[require.resolve(filePath)];
    const config = require(filePath);
    return checkConfig(config?.default || config);
  }

  return checkConfig();
}