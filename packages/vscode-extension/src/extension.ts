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
  generateSingleApiCode,
  GenerateApi,
  appendToFile,
} from '@unoapi/core';

let statusBarItem: vscode.StatusBarItem;

function getWorkspaceRoot() {
  const ws = vscode.workspace.workspaceFolders;
  return ws && ws.length > 0 ? ws[0].uri.fsPath : process.cwd();
}

async function updateStatusBar() {
  const cwd = getWorkspaceRoot();
  process.chdir(cwd);

  const cacheFile = (await loadConfig()).cacheFile;
  let exists = await vscode.workspace.fs.stat(vscode.Uri.file(cacheFile)).then(() => true, () => false);
  if (!exists) {
    for (const type of [UnoConfigType.PACKAGE, UnoConfigType.JS, UnoConfigType.TS]) {
      if (await existsConfig(type)) {
        exists = true;
        break;
      }
    }
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

async function setStatusBarLoading(loading: boolean) {
  if (loading) {
    statusBarItem.text = '$(sync~spin) UnoAPI';
    statusBarItem.tooltip = 'UnoAPI: 正在加载...';
    statusBarItem.command = undefined;
  } else {
    await updateStatusBar();
  }
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

async function pickApis(doc: OpenAPIObject): Promise<ApiOperationObject[] | 'ALL'> {
  const allApis = searchApi(doc);

  const allItem = {
    label: '$(list-unordered) 生成所有接口',
    description: 'Generate All APIs',
    api: 'ALL' as const,
  };

  const apiItems = allApis.map((a) => ({
    label: `[${a.method.toUpperCase()}] ${a.path}`,
    description: [a.summary, a.description].filter(Boolean).join(' - '),
    api: a,
  }));

  // Show first 10 items by default
  const defaultItems = [allItem, ...apiItems.slice(0, 10)];

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = defaultItems;
  quickPick.canSelectMany = true;
  quickPick.placeholder = '搜索接口';
  quickPick.matchOnDescription = true;

  return new Promise((resolve) => {
    quickPick.onDidChangeValue((value) => {
      if (value) {
        // User is searching, filter all APIs
        const filtered = allApis.filter(a =>
          a.path.toLowerCase().includes(value.toLowerCase()) ||
          a.method.toLowerCase().includes(value.toLowerCase()) ||
          a.summary?.toLowerCase().includes(value.toLowerCase()) ||
          a.description?.toLowerCase().includes(value.toLowerCase())
        );
        const filteredItems = filtered.map((a) => ({
          label: `[${a.method.toUpperCase()}] ${a.path}`,
          description: [a.summary, a.description].filter(Boolean).join(' - '),
          api: a,
        }));
        quickPick.items = [allItem, ...filteredItems];
      } else {
        // No search term, show default 10 items
        quickPick.items = defaultItems;
      }
    });

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems as any[];
      quickPick.hide();

      if (!selected || selected.length === 0) {
        resolve([]);
        return;
      }

      // If "ALL" is selected, return 'ALL'
      if (selected.some((s: any) => s.api === 'ALL')) {
        resolve('ALL');
        return;
      }

      resolve(selected.map((i: any) => i.api as ApiOperationObject));
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve([]);
    });

    quickPick.show();
  });
}

export async function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  // Set initial text immediately
  statusBarItem.text = '$(sync~spin) UnoAPI';
  statusBarItem.tooltip = 'UnoAPI: 正在加载...';
  statusBarItem.show();

  // Initialize status
  await updateStatusBar();

  // Watch for config file changes - use separate watchers for each file type
  // Watch package.json in workspace root only (exclude node_modules)
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    const packageJsonPattern = new vscode.RelativePattern(workspaceRoot, 'package.json');
    const packageWatcher = vscode.workspace.createFileSystemWatcher(packageJsonPattern);
    packageWatcher.onDidChange(async () => {
      console.log('[UnoAPI] package.json changed, updating status...');
      await updateStatusBar();
    });
    context.subscriptions.push(packageWatcher);
  }

  const jsConfigWatcher = vscode.workspace.createFileSystemWatcher('**/unoapi.config.js');
  jsConfigWatcher.onDidCreate(async () => {
    console.log('[UnoAPI] unoapi.config.js created, updating status...');
    await updateStatusBar();
  });
  jsConfigWatcher.onDidChange(async () => {
    console.log('[UnoAPI] unoapi.config.js changed, updating status...');
    await updateStatusBar();
  });
  jsConfigWatcher.onDidDelete(async () => {
    console.log('[UnoAPI] unoapi.config.js deleted, updating status...');
    await updateStatusBar();
  });
  context.subscriptions.push(jsConfigWatcher);

  const tsConfigWatcher = vscode.workspace.createFileSystemWatcher('**/unoapi.config.ts');
  tsConfigWatcher.onDidCreate(async () => {
    console.log('[UnoAPI] unoapi.config.ts created, updating status...');
    await updateStatusBar();
  });
  tsConfigWatcher.onDidChange(async () => {
    console.log('[UnoAPI] unoapi.config.ts changed, updating status...');
    await updateStatusBar();
  });
  tsConfigWatcher.onDidDelete(async () => {
    console.log('[UnoAPI] unoapi.config.ts deleted, updating status...');
    await updateStatusBar();
  });
  context.subscriptions.push(tsConfigWatcher);

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

      let doc: OpenAPIObject;
      try {
        setStatusBarLoading(true);
        doc = await getDoc(config);
        setStatusBarLoading(false);
      } catch (e: any) {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(e?.message || '获取文档失败');
        return;
      }

      // Determine output path from URI if provided
      let outputDir = config.output;
      let modelOutputDir = config.modelOutput;
      let targetFile: string | undefined;
      let isFileTarget = false;

      if (uri) {
        const fsPath = uri.fsPath;
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          outputDir = fsPath;
          modelOutputDir = fsPath;
        } else {
          // Target is a file - we'll append to it
          targetFile = fsPath;
          isFileTarget = true;
          outputDir = path.dirname(fsPath);
          modelOutputDir = path.dirname(fsPath);
        }
      }

      const selected = await pickApis(doc);
      if (Array.isArray(selected) && selected.length === 0) {
        // vscode.window.showInformationMessage('未选择任何接口');
        return;
      }

      let apisToGenerate: ApiOperationObject[];
      if (selected === 'ALL') {
        apisToGenerate = searchApi(doc);
      } else {
        apisToGenerate = selected as ApiOperationObject[];
      }

      // Options
      let funcName: string | undefined;
      const onlyModel = false;
      const globalModel = config.asGlobalModel;

      if (apisToGenerate.length === 1) {
        funcName = await vscode.window.showInputBox({
          prompt: '请输入函数名称（可选）',
          placeHolder: 'Leave empty to use default name'
        });
      }

      let genApis: GenerateApi[] = [];

      if (apisToGenerate.length === 1 && funcName) {
        genApis.push(generateSingleApiCode(apisToGenerate[0], {
          funcName: funcName,
          funcTpl: config.funcTpl,
          typeMapping: config.typeMapping,
        }));
      } else {
        genApis = generateCode(apisToGenerate, { funcTpl: config.funcTpl, typeMapping: config.typeMapping });
      }

      try {
        let modelCount = 0;
        for (const genApi of genApis) {
          const baseApiOutput = outputDir;

          if (!onlyModel) {
            if (isFileTarget && targetFile) {
              // Append to specific file
              await appendToFile(targetFile, genApi.sourceCode, config.imports);
            } else {
              // Write to directory structure
              await writeApiFile(genApi, { base: baseApiOutput, imports: config.imports });
            }
          }

          if (doc.components?.schemas) {
            const genModels = genApi.getModels(doc.components.schemas);
            let baseModelOutput = modelOutputDir;
            if (!onlyModel && baseApiOutput === baseModelOutput) {
              baseModelOutput = path.join(baseModelOutput, 'model');
            }
            await writeModelFile(genModels, { base: baseModelOutput, asGlobalModel: globalModel });
            modelCount += genModels.length;
          }
        }
        const targetInfo = isFileTarget ? `到文件: ${path.basename(targetFile!)}` : '';
        vscode.window.showInformationMessage(`本次生成 api: ${onlyModel ? 0 : genApis.length} 个，model: ${modelCount} 个 ${targetInfo}`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '代码生成失败');
      }
    })
  );

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
      let doc: OpenAPIObject;
      try {
        setStatusBarLoading(true);
        doc = await getDoc(config);
        setStatusBarLoading(false);
      } catch (e: any) {
        setStatusBarLoading(false);
        vscode.window.showErrorMessage(e?.message || '获取文档失败');
        return;
      }

      // Determine output path from URI if provided
      let modelOutputDir = config.modelOutput;

      if (uri) {
        const fsPath = uri.fsPath;
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          modelOutputDir = fsPath;
        } else {
          modelOutputDir = path.dirname(fsPath);
        }
      }

      const selected = await pickApis(doc);
      if (Array.isArray(selected) && selected.length === 0) {
        // vscode.window.showInformationMessage('未选择任何接口');
        return;
      }

      let apisToGenerate: ApiOperationObject[];
      if (selected === 'ALL') {
        apisToGenerate = searchApi(doc);
      } else {
        apisToGenerate = selected as ApiOperationObject[];
      }

      const genApis = generateCode(apisToGenerate, { funcTpl: config.funcTpl, typeMapping: config.typeMapping });

      try {
        let modelCount = 0;
        for (const genApi of genApis) {
          if (doc.components?.schemas) {
            const genModels = genApi.getModels(doc.components.schemas);
            await writeModelFile(genModels, { base: modelOutputDir, asGlobalModel: config.asGlobalModel });
            modelCount += genModels.length;
          }
        }
        vscode.window.showInformationMessage(`本次生成 model: ${modelCount} 个`);
      } catch (e: any) {
        vscode.window.showErrorMessage(e?.message || '代码生成失败');
      }
    })
  );
}

export function deactivate() { }
