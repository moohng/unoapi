import * as path from 'path';
import * as fs from 'fs/promises';
import { existsPath } from './tools.js';
import { transformTypeIndexCode } from './transform.js';
import type { ImportTypeItem, GenerateApi, GenerateModel } from './types.js';

interface WriteApiOptions {
  /** base 目录 */
  base: string;
  /** import 头部导入 */
  imports?: string[];
}

/**
 * 写入 API 文件
 * @param api 
 * @param options 
 */
export async function writeApiFile(api: GenerateApi, options: WriteApiOptions) {
  // console.log('写入 api 代码到：', api.filePath);
  const filePath = path.resolve(options.base, api.filePath);
  await appendToFile(filePath, api.sourceCode, options.imports);
}

interface WriteModelOptions {
  /** base 目录 */
  base: string;
  asGlobalModel?: boolean;
}

/**
 * 写入 model 文件
 * @param models 
 * @param options 
 */
export async function writeModelFile(models: GenerateModel[], options: WriteModelOptions) {
  for (const model of models) {
    const modelDir = path.resolve(options.base, model.fileDir);
    const filePath = path.resolve(modelDir, model.fileFullName);
    // console.log('写入 model 代码到：', filePath);
    await writeToFile(filePath, model.sourceCode);
    await writeToIndexFile({
      typeName: model.typeName,
      outDir: path.resolve(modelDir),
      filePath,
      asGlobal: options.asGlobalModel,
    });
  }
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

/**
 * 追加内容到文件
 * @param filePath
 * @param content
 * @returns
 */
export async function appendToFile(filePath: string, content: string, imports?: string[]) {
  // 创建输出文件
  const exists = await existsPath(filePath);
  if (!exists) {
    const importStr = imports?.join('\n');
    if (importStr) {
      content = importStr + '\n' + content;
    }
    return writeToFile(filePath, content);
  }

  // 追加内容
  return fs.appendFile(filePath, content, 'utf8');
}

interface ModelOptions {
  typeName: string;
  outDir: string;
  filePath?: string;
  asGlobal?: boolean;
}

/**
 * 写入到 index.ts
 * @param options
 * @returns
 */
export async function writeToIndexFile(options: ModelOptions) {
  const { typeName, outDir, filePath } = options;
  const modelFilePath = path.join(outDir, 'index.ts');

  let relativePath = filePath ? path.relative(outDir, path.dirname(filePath)) : `.`;
  if (!relativePath.startsWith('.')) {
    relativePath = relativePath ? `./${relativePath}` : '.';
  }

  const importPath = `${relativePath}/${typeName}`;
  const imports = [{ typeName, path: importPath }];

  if (!(await existsPath(modelFilePath))) {
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
  } else {
    const modelFileContent = await fs.readFile(modelFilePath, 'utf-8');
    // 如果已经存在，不需要重复写入
    // if (new RegExp(`\\b${typeName}\\b`, 'g').test(modelFileContent)) {
    //   return modelFilePath;
    // }

    const matched = modelFileContent.matchAll(/import\s_?(.+)\sfrom\s['"](.+)['"]/g);
    const oldImports: ImportTypeItem[] = [];
    for (const m of matched) {
      oldImports.push({ typeName: m[1], path: m[2] });
    }
    imports.push(...oldImports);
  }

  const code = transformTypeIndexCode(imports, options.asGlobal);
  await fs.writeFile(modelFilePath, code, 'utf-8');

  return modelFilePath;
}
