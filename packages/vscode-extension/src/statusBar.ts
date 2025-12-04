import * as vscode from 'vscode';
import { loadConfig, existsConfig, UnoConfigType } from '@unoapi/core';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  // Set initial text immediately
  statusBarItem.text = '$(sync~spin) UnoAPI';
  statusBarItem.tooltip = 'UnoAPI: 正在加载...';
  statusBarItem.show();

  return statusBarItem;
}

export async function updateStatusBar() {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  process.chdir(workspaceRoot);

  let exists = false;
  for (const type of [UnoConfigType.PACKAGE, UnoConfigType.JS]) {
    if (await existsConfig(type)) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    const cacheFile = (await loadConfig()).cacheFile;
    exists = await vscode.workspace.fs.stat(vscode.Uri.file(cacheFile)).then(() => true, () => false);
  }
  if (exists) {
    // Config exists - ready state
    statusBarItem.text = '$(check) UnoAPI';
    statusBarItem.tooltip = 'UnoAPI: 已就绪 - 点击生成代码';
    statusBarItem.command = 'unoapi.generateApi';
    statusBarItem.backgroundColor = undefined;
  } else {
    // No config - not ready state
    statusBarItem.text = '$(warning) UnoAPI';
    statusBarItem.tooltip = 'UnoAPI: 未配置 - 点击初始化配置';
    statusBarItem.command = 'unoapi.initConfig';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

export async function setStatusBarLoading(loading: boolean) {
  if (loading) {
    statusBarItem.text = '$(sync~spin) UnoAPI';
    statusBarItem.tooltip = 'UnoAPI: 正在加载...';
    statusBarItem.command = undefined;
  } else {
    await updateStatusBar();
  }
}

export function setupFileWatchers(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Watch package.json
  const packageJsonPattern = new vscode.RelativePattern(workspaceRoot, 'package.json');
  const packageWatcher = vscode.workspace.createFileSystemWatcher(packageJsonPattern);
  packageWatcher.onDidChange(async () => {
    console.log('[UnoAPI] package.json changed, updating status...');
    await updateStatusBar();
  });
  packageWatcher.onDidCreate(async () => {
    console.log('[UnoAPI] package.json created, updating status...');
    await updateStatusBar();
  });
  packageWatcher.onDidDelete(async () => {
    console.log('[UnoAPI] package.json deleted, updating status...');
    await updateStatusBar();
  });
  context.subscriptions.push(packageWatcher);

  // Watch unoapi.config.js
  const jsConfigPattern = new vscode.RelativePattern(workspaceRoot, 'unoapi.config.js');
  const jsConfigWatcher = vscode.workspace.createFileSystemWatcher(jsConfigPattern);
  jsConfigWatcher.onDidCreate(async () => {
    console.log('[UnoAPI] unoapi.config.js created, updating status...');
    await updateStatusBar();
  });
  jsConfigWatcher.onDidDelete(async () => {
    console.log('[UnoAPI] unoapi.config.js deleted, updating status...');
    await updateStatusBar();
  });
  context.subscriptions.push(jsConfigWatcher);

  // Watch cache file
  loadConfig().then(config => {
    const cacheFileWatcher = vscode.workspace.createFileSystemWatcher(config.cacheFile);
    cacheFileWatcher.onDidCreate(async () => {
      console.log('[UnoAPI] cache file created, updating status...');
      await updateStatusBar();
    });
    cacheFileWatcher.onDidDelete(async () => {
      console.log('[UnoAPI] cache file deleted, updating status...');
      await updateStatusBar();
    });
    context.subscriptions.push(cacheFileWatcher);
  });
}
