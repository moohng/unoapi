import { ImportItem } from "./types";

/**
 * 解析导入语句
 * @param code
 * @returns
 */
export function parseImports(code: string) {
  const lines = code.split('\n');
  const importLines: string[] = [];
  const otherLines: string[] = [];

  // 分离 import 和其他代码
  let currentImport = '';
  for (const line of lines) {
    if (currentImport) {
      currentImport += ' ' + line.trim();
      if (currentImport.includes(' from ') || currentImport.includes(' from"')) {
        importLines.push(currentImport);
        currentImport = '';
      }
    } else if (line.trim().startsWith('import ')) {
      if (line.includes(' from ') || line.includes(' from"') || line.trim().endsWith(';')) {
        importLines.push(line);
      } else {
        currentImport = line;
      }
    } else {
      otherLines.push(line);
    }
  }

  // 解析现有的 imports
  // Map<modulePath, Set<importedItem>>
  const imports = new Map<string, ImportItem>();
  const parsedImports: (string | ImportItem)[] = [];


  for (const line of importLines) {
    // 1. 匹配 import A, type { A, B } from 'path'
    const importRegex1 = /import\s+([\S]+,)?\s*(type)?\s*\{(.+)\}\s+from\s+['"](.+)['"]/;
    const match1 = line.match(importRegex1);
    if (match1) {
      const name = match1[1]?.replace(',', '');
      const names = match1[3].split(',').map(s => s.trim());
      const path = match1[4];
      if (!imports.has(path)) {
        const item: ImportItem = { path, names, defaultName: name, onlyType: match1[2] === 'type' };
        imports.set(path, item);
        parsedImports.push(item);
      } else {
        const item = imports.get(path);
        if (item && typeof item !== 'string') {
          item.defaultName = name;
          item.names = [...(item.names || []), ...names];
        }
      }
      continue;
    }

    // 2. 匹配 import type A from 'path'
    const importRegex2 = /import\s+(type)?\s*([\S]+)\s+from\s+['"](.+)['"]/;
    const match2 = line.match(importRegex2);
    if (match2) {
      const name = match2[2];
      const path = match2[3];
      if (!imports.has(path)) {
        const item: ImportItem = { path, defaultName: name, onlyType: match2[1] === 'type' };
        imports.set(path, item);
        parsedImports.push(item);
      } else {
        const item = imports.get(path);
        if (item && typeof item !== 'string') {
          item.defaultName = name;
        }
      }
      continue;
    }

    // 3. 匹配 import type * as A from 'path'
    const importRegex3 = /import\s+(type)?\s*\*\s+as\s+([\S]+)\s+from\s+['"](.+)['"]/;
    const match3 = line.match(importRegex3);
    if (match3) {
      const name = match3[2];
      const path = match3[3];
      if (!imports.has(path)) {
        const item: ImportItem = { path, asName: name, onlyType: match3[1] === 'type' };
        imports.set(path, item);
        parsedImports.push(item);
      } else {
        const item = imports.get(path);
        if (item && typeof item !== 'string') {
          item.asName = name;
        }
      }
      continue;
    }

    parsedImports.push(line);
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
export function mergeImports(existingImports: ImportItem[], newImports?: ImportItem[]) {
  // 重建 import 块
  const mergedImportLines: string[] = [];

  for (const importItem of newImports || []) {
    if (typeof importItem !== 'string') {
      const hasExist = existingImports.find(item => typeof item !== 'string' && item.path === importItem.path);
      if (hasExist && typeof hasExist !== 'string') {
        hasExist.names = [...(hasExist.names || []), ...(importItem.names || [])];
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
    } else if (item.names?.length) {
      const itemsStr = Array.from(new Set(item.names)).join(', ');
      mergedImportLines.push(`import${item.defaultName ? ` ${item.defaultName},` : ''}${item.onlyType ? ' type' : ''} { ${itemsStr} } from '${item.path}';`);
    } else if (item.asName) {
      mergedImportLines.push(`import${item.onlyType ? ' type' : ''} * as ${item.asName} from '${item.path}';`);
    } else if (item.defaultName) {
      mergedImportLines.push(`import${item.onlyType ? ' type' : ''} ${item.defaultName} from '${item.path}';`);
    }
  });

  return [...mergedImportLines].join('\n');
}