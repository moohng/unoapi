import * as vscode from 'vscode';
import * as path from 'path';
import {
  loadConfig,
  downloadDoc,
  loadDoc,
  searchApi,
  generateCode,
  writeApiFile,
  writeModelFile,
  UnoConfigType,
  generateConfigFile,
  existsConfig,
  ApiOperationObject,
  OpenAPIObject,
} from '@unoapi/core';

function getWorkspaceRoot() {
  const ws = vscode.workspace.workspaceFolders;
  return ws && ws.length > 0 ? ws[0].uri.fsPath : process.cwd();
}

async function getDoc(config: any): Promise<OpenAPIObject> {
  try {
    return loadDoc(config.cacheFile);
  } catch {
    if (!config.openapiUrl) {
      throw new Error('未配置 openapiUrl');
    }
    return downloadDoc(config.openapiUrl as any);
  }
}

async function pickApis(doc: OpenAPIObject): Promise<ApiOperationObject[]> {
  const term = await vscode.window.showInputBox({ prompt: '输入关键字搜索接口（留空显示全部）' });
  const apis = searchApi(doc, term || undefined);
  const items = apis.map((a) => ({
    label: `[${a.method.toUpperCase()}] ${a.path}`,
    description: [a.summary, a.description].filter(Boolean).join(' - '),
    api: a,
  }));
  const selected = await vscode.window.showQuickPick(items, { canPickMany: true, matchOnDescription: true });
  if (!selected || selected.length === 0) return [];
  return selected.map((i) => i.api);
}

export async function activate(context: vscode.ExtensionContext) {
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
        { label: 'package.json 中', detail: '将配置写入 package.json 的 unoapi 字段', value: UnoConfigType.PACKAGE },
        { label: 'JavaScript 风格', detail: '生成 unoapi.config.js', value: UnoConfigType.JS },
        { label: 'TypeScript 风格', detail: '生成 unoapi.config.ts', value: UnoConfigType.TS },
      ], { title: '选择一种配置风格', canPickMany: false });
      if (!typeItem) {
        vscode.window.showWarningMessage('未选择配置风格');
        return;
      }

      const cwd = getWorkspaceRoot();
      process.chdir(cwd);

      try {
        const exists = await existsConfig(typeItem.value);
        if (exists) {
          const action = await vscode.window.showQuickPick(['覆盖', '取消'], {
            placeHolder: '配置文件已存在，是否覆盖？',
          });
          if (action !== '覆盖') {
            vscode.window.showInformationMessage('操作取消');
            return;
          }
        }
        const file = await generateConfigFile(url, typeItem.value);
        vscode.window.showInformationMessage(`已生成配置：${file}`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '生成配置失败');
      }
    })
  );

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
        return;
      }

      try {
        await downloadDoc(openapiUrl, config.cacheFile);
        vscode.window.showInformationMessage(`下载成功！已保存到：${config.cacheFile}`);
      } catch {
        vscode.window.showErrorMessage(`下载失败，请检查 openapiUrl：${openapiUrl} 是否正确！`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('unoapi.generateApi', async () => {
      const cwd = getWorkspaceRoot();
      process.chdir(cwd);
      let config: any;
      try {
        config = await loadConfig();
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '加载配置失败');
        return;
      }
      let doc: OpenAPIObject;
      try {
        doc = await getDoc(config);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '获取文档失败');
        return;
      }
      const selected = await pickApis(doc);
      if (!selected.length) {
        vscode.window.showInformationMessage('未选择任何接口');
        return;
      }
      const genApis = generateCode(selected, { funcTpl: config.funcTpl, typeMapping: config.typeMapping });
      try {
        let modelCount = 0;
        for (const genApi of genApis) {
          const baseApiOutput = config.output;
          await writeApiFile(genApi, { base: baseApiOutput, imports: config.imports });
          if (doc.components?.schemas) {
            const genModels = genApi.getModels(doc.components.schemas);
            let baseModelOutput = config.modelOutput;
            if (baseApiOutput === baseModelOutput) {
              baseModelOutput = path.join(baseModelOutput, 'model');
            }
            await writeModelFile(genModels, { base: baseModelOutput, asGlobalModel: config.asGlobalModel });
            modelCount += genModels.length;
          }
        }
        vscode.window.showInformationMessage(`本次生成 api: ${genApis.length} 个，model: ${modelCount} 个`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '代码生成失败');
      }
    })
  );
}

export function deactivate() {}
