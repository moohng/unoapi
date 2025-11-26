import * as vscode from 'vscode';
import { searchApi, ApiOperationObject, OpenAPIObject } from '@unoapi/core';

export async function pickApis(doc: OpenAPIObject): Promise<ApiOperationObject[] | 'ALL'> {
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
