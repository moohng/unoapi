import * as path from 'path';
import * as fs from 'fs/promises';
import { existsPath } from './tools.js';
import { ImportTypeItem, transformTypeIndexCode } from './transform.js';

/**
 * 写入文件
 * @param filePath
 * @param content
 */
export async function writeToFile(filePath: string, content: string) {
  // 创建输出文件
  const exists = await existsPath(path.dirname(filePath));
  if (!exists) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  // 生成文件
  return fs.writeFile(filePath, content, 'utf8');
}

/**
 * 追加内容到文件
 * @param filePath
 * @param content
 * @returns
 */
export async function appendToFile(filePath: string, content: string) {
  // 创建输出文件
  const exists = await existsPath(filePath);
  if (!exists) {
    return writeToFile(filePath, content);
  }

  // 追加内容
  return fs.appendFile(filePath, content, 'utf8');
}

/**
 * 写入到index.ts
 * @param typeName
 * @param outDir
 * @returns
 */
export async function writeToIndexFile(typeName: string, outDir: string, filePath?: string) {
  const modelFilePath = path.join(outDir, 'index.ts');

  let relativePath = filePath ? path.relative(outDir, path.dirname(filePath)) : `.`;
  if (!relativePath.startsWith('.')) {
    relativePath = relativePath ? `./${relativePath}` : '.';
  }

  const imports = [{ typeName, path: `${relativePath}/${typeName}` }];

  // 新建
  if (!(await existsPath(modelFilePath))) {
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
  } else {
    let modelFileContent = await fs.readFile(modelFilePath, 'utf-8');
    // 判断是否已经导入
    if (modelFileContent.indexOf('type ' + typeName + ' ') === -1) {
      const matched = modelFileContent.matchAll(/import\s_(.+)\sfrom\s['"](.+)['"]/g);
      const oldImports: ImportTypeItem[] = [];
      for (const m of matched) {
        oldImports.push({ typeName: m[1], path: m[2] });
      }
      imports.unshift(...oldImports);
    }
  }

  const code = transformTypeIndexCode(imports);
  await fs.writeFile(modelFilePath, code, 'utf-8');

  return modelFilePath;
}
