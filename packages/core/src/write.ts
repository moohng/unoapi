import * as path from 'path';
import * as fs from 'fs/promises';
import { existsPath } from './tools.js';

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

  // 新建
  if (!(await existsPath(modelFilePath))) {
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
    await fs.writeFile(modelFilePath, `export { default as ${typeName} } from '${relativePath}/${typeName}';\n`);

    return modelFilePath;
  }

  let modelFileContent = await fs.readFile(modelFilePath, 'utf-8');
  // 判断是否已经导入
  if (modelFileContent.indexOf('as ' + typeName + ' ') === -1) {
    // 追加
    await fs.appendFile(modelFilePath, `export { default as ${typeName} } from '${relativePath}/${typeName}';\n`);
  }

  return modelFilePath;
}
