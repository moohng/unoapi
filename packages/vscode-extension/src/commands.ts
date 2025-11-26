import * as vscode from 'vscode';
import * as path from 'path';
import {
  loadConfig,
  downloadDoc,
  searchApi,
  UnoConfigType,
  generateConfigFile,
  existsConfig,
  ApiOperationObject,
} from '@unoapi/core';
import { updateStatusBar, setStatusBarLoading } from './statusBar.js';
import { pickApis } from './apiPicker.js';
import { getDoc, determineOutputPaths, generateApiCode } from './codeGenerator.js';

function getWorkspaceRoot() {
  const ws = vscode.workspace.workspaceFolders;
  return ws && ws.length > 0 ? ws[0].uri.fsPath : process.cwd();
}

export function registerInitConfigCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.initConfig', async () => {
      let url = await vscode.window.showInputBox({
        prompt: 'OpenAPI JSON 文档地址：',
        value: 'https://api.example.com/openapi.json',
        placeHolder: 'https://api.example.com/openapi.json',
      });
      if (!url) {
        url = 'https://api.example.com/openapi.json';
      }
      const typeItem = await vscode.window.showQuickPick([
        { label: 'package.json（默认）', detail: '将配置写入 package.json 的 unoapi 字段', value: UnoConfigType.PACKAGE },
        { label: 'JavaScript 风格', detail: '生成 unoapi.config.js', value: UnoConfigType.JS },
        { label: 'TypeScript 风格', detail: '生成 unoapi.config.ts', value: UnoConfigType.TS },
      ], { placeHolder: '选择一种配置风格', canPickMany: false });

      const cwd = getWorkspaceRoot();
      process.chdir(cwd);

      const typeValue = typeItem?.value || UnoConfigType.PACKAGE;
      try {
        const exists = await existsConfig(typeValue);
        if (exists) {
          const action = await vscode.window.showQuickPick(['覆盖', '取消'], {
            placeHolder: '配置文件已存在，是否覆盖？',
          });
          if (action !== '覆盖') {
            vscode.window.showInformationMessage('操作取消');
            return;
          }
        }
        const file = await generateConfigFile(url, typeValue);
        vscode.window.showInformationMessage(`已生成配置：${file}`);
        await updateStatusBar();
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '生成配置失败');
      }
    })
  );
}

export function registerDownloadDocCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.downloadDocument', async () => {
      const cwd = getWorkspaceRoot();
      process.chdir(cwd);

      const config = await loadConfig();
      console.log('config', config);
      let openapiUrl = config.openapiUrl;

      if (!openapiUrl) {
        openapiUrl = await vscode.window.showInputBox({
          prompt: 'OpenAPI JSON 文档地址：',
          placeHolder: 'https://api.example.com/openapi.json',
          validateInput: (value) => {
            if (!value || !value.startsWith('http')) {
              return '请输入 OpenAPI JSON 文档地址';
            }
            return '';
          },
        });
      }

      if (!openapiUrl) {
        vscode.window.showWarningMessage('未配置 openapiUrl！');
        await updateStatusBar();
        return;
      }

      try {
        setStatusBarLoading(true);
        await downloadDoc(openapiUrl, config.cacheFile);
        setStatusBarLoading(false);
        vscode.window.showInformationMessage(`下载成功！已保存到：${config.cacheFile}`);
      } catch {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(`下载失败，请检查 openapiUrl：${openapiUrl} 是否正确！`);
      }
    })
  );
}

export function registerGenerateApiCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.generateApi', async (uri?: vscode.Uri) => {
      const cwd = getWorkspaceRoot();
      process.chdir(cwd);
      let config: any;
      try {
        config = await loadConfig();
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '加载配置失败');
        await updateStatusBar();
        return;
      }

      let doc;
      try {
        setStatusBarLoading(true);
        doc = await getDoc(config);
        setStatusBarLoading(false);
      } catch (e: any) {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(e?.message || '获取文档失败');
        return;
      }

      const outputPaths = await determineOutputPaths(uri, config);

      const selected = await pickApis(doc);
      if (Array.isArray(selected) && selected.length === 0) {
        return;
      }

      let apisToGenerate: ApiOperationObject[];
      if (selected === 'ALL') {
        apisToGenerate = searchApi(doc);
      } else {
        apisToGenerate = selected as ApiOperationObject[];
      }

      // Get custom function name for single API
      let funcName: string | undefined;
      if (apisToGenerate.length === 1) {
        funcName = await vscode.window.showInputBox({
          prompt: '请输入函数名称（可选）',
          placeHolder: 'Leave empty to use default name'
        });
      }

      try {
        const { apiCount, modelCount } = await generateApiCode({
          apis: apisToGenerate,
          config,
          doc,
          outputPaths,
          funcName,
        });
        const targetInfo = outputPaths.isFileTarget ? `到文件: ${path.basename(outputPaths.targetFile!)}` : '';
        vscode.window.showInformationMessage(`本次生成 api: ${apiCount} 个，model: ${modelCount} 个 ${targetInfo}`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '代码生成失败');
      }
    })
  );
}

export function registerGenerateModelCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.generateModel', async (uri?: vscode.Uri) => {
      const cwd = getWorkspaceRoot();
      process.chdir(cwd);
      let config: any;
      try {
        config = await loadConfig();
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '加载配置失败');
        await updateStatusBar();
        return;
      }
      let doc;
      try {
        setStatusBarLoading(true);
        doc = await getDoc(config);
        setStatusBarLoading(false);
      } catch (e: any) {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(e?.message || '获取文档失败');
        return;
      }

      const outputPaths = await determineOutputPaths(uri, config);

      const selected = await pickApis(doc);
      if (Array.isArray(selected) && selected.length === 0) {
        return;
      }

      let apisToGenerate: ApiOperationObject[];
      if (selected === 'ALL') {
        apisToGenerate = searchApi(doc);
      } else {
        apisToGenerate = selected as ApiOperationObject[];
      }

      try {
        const { modelCount } = await generateApiCode({
          apis: apisToGenerate,
          config,
          doc,
          outputPaths,
          onlyModel: true,
        });
        vscode.window.showInformationMessage(`本次生成 model: ${modelCount} 个`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '代码生成失败');
      }
    })
  );
}
