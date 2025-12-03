import * as vscode from 'vscode';
import { searchApi, ApiOperationObject, OpenAPIObject } from '@unoapi/core';

export async function pickApis(doc: OpenAPIObject): Promise<ApiOperationObject[]> {
  const apis = searchApi(doc);
  const apiItems = apis.map((a) => ({
    label: `[${a.method.toUpperCase()}] ${a.path}`,
    description: a.summary,
    detail: a.description,
    api: a,
  }));

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = apiItems;
  quickPick.canSelectMany = true;
  quickPick.placeholder = '搜索接口';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  return new Promise((resolve) => {

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems as any[];
      quickPick.hide();

      if (!selected || selected.length === 0) {
        resolve([]);
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
