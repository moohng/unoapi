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
export async function writeModelToFile(models: GenerateModel[], options: WriteModelOptions) {
  const filePaths: string[] = [];
  for (const model of models) {
    const filePath = path.resolve(options.base, model.fileFullName);
    // console.log('写入 model 代码到：', filePath);
    await writeToFile(filePath, model.sourceCode);
    filePaths.push(filePath);
  }
  await writeModelToIndexFile(models.map((model, index) => ({
    fileName: model.fileName,
    filePath: filePaths[index],
    genericParams: model.genericParams,
  })), { outDir: path.resolve(options.base), asGlobal: options.asGlobalModel });
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

interface ModelItem {
  fileName: string;
  filePath?: string;
  genericParams?: string[];
}

interface WriteModelToIndexFileOptions {
  outDir: string;
  asGlobal?: boolean;
}

/**
 * 写入到 index.ts
 * @param items
 * @returns
 */
export async function writeModelToIndexFile(items: ModelItem[], options: WriteModelToIndexFileOptions) {
  const imports: ImportTypeItem[] = items.map(option => {
    const { fileName, filePath } = option;
    let relativePath = filePath ? path.relative(options.outDir, path.dirname(filePath)) : `.`;
    if (!relativePath.startsWith('.')) {
      relativePath = relativePath ? `./${relativePath}` : '.';
    }

    const importPath = `${relativePath}/${fileName}`;
    return { fileName, path: importPath, genericParams: option.genericParams };
  });

  const modelFilePath = path.join(options.outDir, 'index.ts');
  if (!(await existsPath(modelFilePath))) {
    await fs.mkdir(path.dirname(modelFilePath), { recursive: true });
  } else {
    const modelFileContent = await fs.readFile(modelFilePath, 'utf-8');
    const matched = modelFileContent.matchAll(/import\s_?(.+)\sfrom\s['"](.+)['"]/g);
    const oldImports: ImportTypeItem[] = [];
    for (const m of matched) {
      const item: ImportTypeItem = { fileName: m[1], path: m[2] };
      if (options.asGlobal) {
        // 检测类型是否有泛型参数
        const typeFilePath = path.join(path.dirname(modelFilePath), m[1] + '.ts');
        try {
          const typeContent = await fs.readFile(typeFilePath, 'utf-8');
          const matched = typeContent.match(new RegExp(`interface ${m[1]}<(.+)>`));
          item.genericParams = matched?.[1].split(',');
        } catch {
          throw new Error(`未找到类型文件：${typeFilePath}`);
        }
      }
      oldImports.push(item);
    }
    imports.push(...oldImports);
  }

  const code = transformTypeIndexCode(imports, options.asGlobal);
  await fs.writeFile(modelFilePath, code, 'utf-8');

  return modelFilePath;
}
