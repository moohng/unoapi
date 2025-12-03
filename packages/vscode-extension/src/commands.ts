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
  OpenAPIObject,
  loadDoc,
  autoWriteAll,
  GenerateApi,
  generateSingleApiCode,
  generateCode,
} from '@unoapi/core';
import { updateStatusBar, setStatusBarLoading } from './statusBar';
import { pickApis } from './apiPicker';
import { determineOutputPaths } from './codeGenerator';

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

      const openapiUrl = await vscode.window.showInputBox({
        prompt: 'OpenAPI JSON 文档地址：',
        placeHolder: 'https://api.example.com/openapi.json',
        validateInput: (value) => {
          if (!value || !value.startsWith('http')) {
            return '请输入 OpenAPI JSON 文档地址';
          }
          return '';
        },
      });

      if (!openapiUrl) {
        vscode.window.showWarningMessage('请输入 openapiUrl！');
        return;
      }

      try {
        setStatusBarLoading(true);
        const downlaodPath = await downloadDoc(openapiUrl);
        setStatusBarLoading(false);
        vscode.window.showInformationMessage(`下载成功！已保存到：${downlaodPath}`);
      } catch {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(`下载失败，请检查 openapiUrl：${openapiUrl} 是否正确！`);
      }
    })
  );
}

export function registerGenerateApiCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.generateApi', async (uri?: vscode.Uri, onlyModel?: boolean) => {
      const cwd = getWorkspaceRoot();
      process.chdir(cwd);

      const config = await loadConfig();

      let doc: OpenAPIObject;

      if (config.input) {
        try {
          setStatusBarLoading(true);
          doc = await loadDoc(config.input);
          setStatusBarLoading(false);
        } catch (e: any) {
          setStatusBarLoading(false);
          vscode.window.showErrorMessage(e?.message || '获取文档失败');
          return;
        }
      } else if (config.cacheFile) {
        try {
          setStatusBarLoading(true);
          doc = await loadDoc(config.cacheFile);
          setStatusBarLoading(false);
        } catch {
          setStatusBarLoading(false);
          vscode.window.showErrorMessage(`未找到 OpenAPI JSON 文档，请检查配置文件中的 input：${config.input} 是否正确！`);
          return;
        }
      } else {
        vscode.window.showErrorMessage('未找到 OpenAPI JSON 文档，请检查配置文件中的 input 是否正确！');
        return;
      }

      const selected = await pickApis(doc);
      if (Array.isArray(selected) && selected.length === 0) {
        return;
      }

      let genApis: GenerateApi[] = [];

      if (!selected.length) {
        console.warn('未找到接口');
        return;
      }

      if (selected.length === 1) {
        let funcName: string | undefined;
        if (!onlyModel && !config.onlyModel) {
        // 让用户输入一个函数名称
          funcName = await vscode.window.showInputBox({
            placeHolder: '请输入函数名称（可选）'
          });
        }
        genApis.push(generateSingleApiCode(selected[0], {
          funcName,
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
          ignores: config.ignores,
        }));
      } else {
        genApis = generateCode(selected, {
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
          ignores: config.ignores,
        });
      }

      const { outputDir, targetFile, isFileTarget } = await determineOutputPaths(uri, config.output);
      try {
        const { apiCount, modelCount } = await autoWriteAll(genApis, {
          apiOutput: isFileTarget ? targetFile! : outputDir,
          modelOutput: config.modelOutput,
          isOverride: !!uri,
          onlyModel: onlyModel ?? config.onlyModel,
          schemas: doc.components?.schemas,
          imports: config.imports,
          writedCallback: (type, filePath) => {
            console.log(`生成 ${type}：  ${filePath}`);
          },
        });
        const targetInfo = isFileTarget ? `到文件: ${path.basename(targetFile!)}` : '';
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
      // 调用 generateApi 命令,并传递 onlyModel=true
      await vscode.commands.executeCommand('unoapi.generateApi', uri, true);
    })
  );
}
