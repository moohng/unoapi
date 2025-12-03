import * as vscode from 'vscode';
import { searchApi, ApiOperationObject, OpenAPIObject } from '@unoapi/core';

export async function pickApis(doc: OpenAPIObject): Promise<ApiOperationObject[]> {
  const apis = searchApi(doc);

  const MAX_API_COUNT = 100;

  const apiItems = apis.slice(0, MAX_API_COUNT).map((a) => ({
    label: `[${a.method.toUpperCase()}] ${a.path}`,
    description: [a.summary, a.description].filter(Boolean).join(' - '),
    api: a,
  }));

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = apiItems;
  quickPick.canSelectMany = true;
  quickPick.placeholder = '搜索接口';
  quickPick.matchOnDescription = true;

  quickPick.onDidChangeValue((value) => {
    if (value) {
      const filtered = searchApi(doc, value);
      const filteredItems = filtered.slice(0, MAX_API_COUNT).map((a) => ({
        label: `[${a.method.toUpperCase()}] ${a.path}`,
        description: [a.summary, a.description].filter(Boolean).join(' - '),
        api: a,
      }));
      quickPick.items = filteredItems;
    } else {
      quickPick.items = apiItems;
    }
  });

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
