import * as path from 'path';
import * as fs from 'fs/promises';
import { existsPath } from './tools.js';
import { transformTypeIndexCode } from './transform.js';
import type { ImportItem, GenerateApi, GenerateModel } from './types.js';
import { mergeImports, parseImports } from './import.js';

interface WriteApiOptions {
  /** base 目录 */
  base: string;
  /** 覆盖默认写入 文件路径 */
  filePath?: string;
  /** import 头部导入 */
  imports?: (string | ImportItem)[];
}

/**
 * 写入 API 文件
 * @param api 
 * @param options 
 */
export async function writeApiToFile(api: GenerateApi, options: WriteApiOptions) {
  // console.log('写入 api 代码到：', api.filePath);
  const filePath = options.filePath ? path.resolve(options.filePath) : path.resolve(options.base, api.filePath);
  let content = api.sourceCode;
  const imports = options.imports;

  // 创建输出文件
  const exists = await existsPath(filePath);
  if (!exists) {
    const importStr = mergeImports(imports || []);
    if (importStr) {
      content = importStr + '\n\n' + content + '\n';
    }
    return writeToFile(filePath, content);
  }

  // 读取现有内容
  let fileContent = await fs.readFile(filePath, 'utf-8');

  // 合并 import
  if (imports?.length) {
    const { parsedImports, otherLines } = parseImports(fileContent);
    fileContent = mergeImports(parsedImports, imports);
    fileContent += '\n' + otherLines.join('\n');
  }

  // 写入内容
  return writeToFile(filePath, fileContent + '\n' + content + '\n');
}

interface WriteModelOptions {
  /** base 目录 */
  base: string;
}

/**
 * 写入 model 文件
 * @param models 
 * @param options 
 */
export async function writeModelToFile(models: GenerateModel[], options: WriteModelOptions) {
  const filePaths: string[] = [];

  for (const model of models) {
    const filePath = path.resolve(options.base, model.fileFullName);
    // console.log('写入 model 代码到：', filePath);
    await writeToFile(filePath, model.sourceCode);
    filePaths.push(filePath);
  }

  const indexFilePath = await writeModelToIndexFile(models.map((model, index) => ({
    fileName: model.fileName,
    filePath: filePaths[index],
  })), { outDir: path.resolve(options.base) });

  return {
    indexFilePath,
    fileNames: models.map(m => m.fileName),
  };
}

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

interface ModelItem {
  fileName: string;
  filePath?: string;
}

interface WriteModelToIndexFileOptions {
  outDir: string;
}

/**
 * 写入到 index.ts
 * @param items
 * @returns
 */
export async function writeModelToIndexFile(items: ModelItem[], options: WriteModelToIndexFileOptions) {
  const imports: ImportItem[] = items.map(option => {
    const { fileName, filePath } = option;
    let relativePath = filePath ? path.relative(options.outDir, path.dirname(filePath)) : `.`;
    if (!relativePath.startsWith('.')) {
      relativePath = relativePath ? `./${relativePath}` : '.';
    }

    const importPath = `${relativePath}/${fileName}`;
    return { defaultName: fileName, path: importPath };
  });

  const modelFilePath = path.join(options.outDir, 'index.ts');
  if (!(await existsPath(modelFilePath))) {
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
  } else {
    const modelFileContent = await fs.readFile(modelFilePath, 'utf-8');
    const { parsedImports } = parseImports(modelFileContent);
    imports.push(...parsedImports);
  }

  const code = transformTypeIndexCode(imports);
  await fs.writeFile(modelFilePath, code, 'utf-8');

  return modelFilePath;
}
