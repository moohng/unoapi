import * as vscode from 'vscode';
import * as path from 'path';

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
