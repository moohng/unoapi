export interface ImportItem {
  path: string;
  names: string[];
  onlyType?: boolean;
}

export function parseImports(code: string) {
  const lines = code.split('\n');
  const importLines: string[] = [];
  const otherLines: string[] = [];

  // 分离 import 和其他代码
  for (const line of lines) {
    if (line.trim().startsWith('import ')) {
      importLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  // 解析现有的 imports
  // Map<modulePath, Set<importedItem>>
  const imports = new Map<string, ImportItem>();
  const parsedImports: (string | ImportItem)[] = [];

  // 简单的正则匹配 import { A, B } from 'path'
  // 注意：这里只处理简单的命名导入，复杂的 default import 或 * as 需要更复杂的解析，但对于生成的代码通常足够
  const importRegex = /import\s+(type)?\s*\{(.+)\}\s+from\s+['"](.+)['"]/;

  for (const line of importLines) {
    const match = line.match(importRegex);
    if (match) {
      const names = match[2].split(',').map(s => s.trim());
      const path = match[3];
      if (!imports.has(path)) {
        const item: ImportItem = { path, names, onlyType: match[1] === 'type' };
        imports.set(path, item);
        parsedImports.push(item);
      } else {
        const item = imports.get(path);
        if (item) {
          item.names.push(...names);
        }
      }
    } else {
      parsedImports.push(line);
    }
  }

  return {
    parsedImports,
    otherLines,
  };
}

/**
 * 合并 import 语句
 * @param existingImports 原始 import 语句数组
 * @param newImports 新的 import 语句数组
 */
export function mergeImports(existingImports: (string | ImportItem)[], newImports?: (string | ImportItem)[]) {
  // 重建 import 块
  const mergedImportLines: string[] = [];

  for (const importItem of newImports || []) {
    if (typeof importItem !== 'string') {
      const hasExist = existingImports.find(item => (item as ImportItem).path === importItem.path);
      if (hasExist) {
        (hasExist as ImportItem).names.push(...importItem.names);
      } else {
        existingImports.push(importItem);
      }
    }
  }

  // 添加新的且未被处理的 import
  existingImports.forEach((item) => {
    if (typeof item === 'string') {
      if (!mergedImportLines.includes(item)) {
        mergedImportLines.push(item);
      }
    } else {
      const itemsStr = Array.from(new Set(item.names)).join(', ');
      mergedImportLines.push(`import${item.onlyType ? ' type' : ''} { ${itemsStr} } from '${item.path}';`);
    }
  });

  return [...mergedImportLines].join('\n');
}