import * as path from 'path';
import * as fs from 'fs/promises';
import { existsPath, isDirectory } from './tools.js';
import { transformTypeIndexCode } from './transform.js';
import type { ImportItem, GenerateApi, GenerateModel, ModelSchemaCollection } from './types.js';
import { mergeImports, parseImports } from './import.js';
import { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';

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
  let filePath = path.resolve(await isDirectory(options.base) ? options.base : '', api.filePath);
  if (options.filePath) {
    filePath = await isDirectory(options.filePath) ? path.resolve(options.filePath, api.fileFullName) : path.resolve(options.filePath);
  }
  let content = api.sourceCode;
  const imports = options.imports;

  // 创建输出文件
  const exists = await existsPath(filePath);
  if (!exists) {
    const importStr = mergeImports(imports || []);
    if (importStr) {
      content = importStr + '\n\n' + content + '\n';
    }
    await writeToFile(filePath, content);
    return filePath;
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
  await writeToFile(filePath, fileContent + '\n' + content + '\n');
  return filePath;
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
    await writeToFile(filePath, model.sourceCode);
    filePaths.push(filePath);
  }

  const indexFilePath = await writeModelToIndexFile(models.map((model, index) => ({
    fileName: model.fileName,
    filePath: filePaths[index],
  })), path.resolve(options.base));

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
    console.log('创建目录：', filePath, path.dirname(filePath));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  // 生成文件
  return fs.writeFile(filePath, content, 'utf8');
}

interface ModelItem {
  fileName: string;
  filePath?: string;
}

/**
 * 写入到 index.ts
 * @param items
 * @returns
 */
export async function writeModelToIndexFile(items: ModelItem[], baseDir: string) {
  if (!items.length) {
    return;
  }

  const imports: ImportItem[] = items.map(({ fileName, filePath }) => {
    let relativePath = filePath ? path.relative(baseDir, path.dirname(filePath)) : `.`;
    if (!relativePath.startsWith('.')) {
      relativePath = relativePath ? `./${relativePath}` : '.';
    }

    const importPath = `${relativePath}/${fileName}`;
    return { defaultName: fileName, path: importPath };
  });

  const modelFilePath = path.join(baseDir, 'index.ts');
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

interface AutoWriteAllOptions {
  schemas?: ModelSchemaCollection;
  apiOutput: string;
  modelOutput?: string;
  isOverride?: boolean;
  onlyModel?: boolean;
  imports?: (string | ImportItem)[];
  writedCallback?: (type: 'model' | 'api', filePath: string) => void;
}

/**
 * 自动写入所有文件
 * @param genApis
 * @param options
 */
export async function autoWriteAll(genApis: GenerateApi[], options: AutoWriteAllOptions) {
  let apiCount = 0;
  let modelCount = 0;
  for (const genApi of genApis) {
    const { schemas, modelOutput, apiOutput, isOverride, onlyModel } = options;
    // 需要导入的 model 文件
    let modelImport: ImportItem | undefined;

    const genModels = genApi.getModels(schemas);
    if (genModels.length) {
      let baseModelOutput = modelOutput || apiOutput;
      if (!await isDirectory(baseModelOutput)) {
        baseModelOutput = path.dirname(baseModelOutput);
      }
      baseModelOutput = path.join(baseModelOutput, !isOverride ? genApi.fileDir : '', (onlyModel || modelOutput) ? '' : 'model');

      // 写入 model 文件
      const { indexFilePath, fileNames } = await writeModelToFile(genModels, {
        base: baseModelOutput,
      });

      modelCount += genModels.length;

      genModels.forEach(m => {
        options.writedCallback?.('model', path.join(baseModelOutput, m.filePath));
      });

      // 计算 model 导入路径
      if (fileNames.length) {
        const genApiPath = isOverride ? (await isDirectory(apiOutput) ? apiOutput : path.dirname(apiOutput)) : path.join(apiOutput, genApi.fileDir);
        let relativePath = path.relative(genApiPath, path.dirname(indexFilePath!));
        relativePath = relativePath.replace(/\\/g, '/');
        if (!relativePath.startsWith('.')) {
          relativePath = `./${relativePath}`;
        }
        modelImport = { path: relativePath, names: fileNames.filter(name => genApi.useModels?.includes(name)), onlyType: true };
      }
    }

    // 写入 api 文件
    if (!onlyModel) {
      const imports: (string | ImportItem)[] = options.imports ? [...options.imports] : [];

      // 导入 model
      if (modelImport) {
        imports.push(modelImport);
      }

      const filePath = await writeApiToFile(genApi, {
        base: apiOutput,
        imports,
        filePath: isOverride ? apiOutput : undefined,
      });
      options.writedCallback?.('api', filePath);
      apiCount++;
    }
  }

  return {
    apiCount,
    modelCount,
  };
}
