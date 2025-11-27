import * as vscode from 'vscode';
import * as path from 'path';
import {
  loadDoc,
  downloadDoc,
  generateCode,
  writeApiFile,
  writeModelToFile,
  generateSingleApiCode,
  appendToFile,
  ApiOperationObject,
  OpenAPIObject,
  GenerateApi,
} from '@unoapi/core';

export async function getDoc(config: any): Promise<OpenAPIObject> {
  try {
    return loadDoc(config.cacheFile);
  } catch {
    if (!config.openapiUrl) {
      throw new Error('未配置 openapiUrl');
    }
    return downloadDoc(config.openapiUrl as any);
  }
}

export interface OutputPaths {
  outputDir: string;
  modelOutputDir: string;
  targetFile?: string;
  isFileTarget: boolean;
}

export async function determineOutputPaths(uri: vscode.Uri | undefined, config: any): Promise<OutputPaths> {
  let outputDir = config.output;
  let modelOutputDir = config.modelOutput;
  let targetFile: string | undefined;
  let isFileTarget = false;

  if (uri) {
    const fsPath = uri.fsPath;
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.Directory) {
      outputDir = fsPath;
      modelOutputDir = fsPath;
    } else {
      // Target is a file - we'll append to it
      targetFile = fsPath;
      isFileTarget = true;
      outputDir = path.dirname(fsPath);
      modelOutputDir = path.dirname(fsPath);
    }
  }

  return { outputDir, modelOutputDir, targetFile, isFileTarget };
}

export interface GenerateOptions {
  apis: ApiOperationObject[];
  config: any;
  doc: OpenAPIObject;
  outputPaths: OutputPaths;
  onlyModel?: boolean;
  funcName?: string;
}

export async function generateApiCode(options: GenerateOptions): Promise<{ apiCount: number; modelCount: number }> {
  const { apis, config, doc, outputPaths, onlyModel = false, funcName } = options;
  const { outputDir, modelOutputDir, targetFile, isFileTarget } = outputPaths;

  let genApis: GenerateApi[] = [];

  if (apis.length === 1 && funcName) {
    genApis.push(generateSingleApiCode(apis[0], {
      funcName: funcName,
      funcTpl: config.funcTpl,
      typeMapping: config.typeMapping,
    }));
  } else {
    genApis = generateCode(apis, { funcTpl: config.funcTpl, typeMapping: config.typeMapping });
  }

  let modelCount = 0;
  for (const genApi of genApis) {
    const baseApiOutput = outputDir;

    if (!onlyModel) {
      if (isFileTarget && targetFile) {
        // Append to specific file
        await appendToFile(targetFile, genApi.sourceCode, config.imports);
      } else {
        // Write to directory structure
        await writeApiFile(genApi, { base: baseApiOutput, imports: config.imports });
      }
    }

    if (doc.components?.schemas) {
      const genModels = genApi.getModels(doc.components.schemas);
      let baseModelOutput = modelOutputDir;
      if (!onlyModel && baseApiOutput === baseModelOutput) {
        baseModelOutput = path.join(baseModelOutput, 'model');
      }
      await writeModelToFile(genModels, { base: baseModelOutput, asGlobalModel: config.asGlobalModel });
      modelCount += genModels.length;
    }
  }

  return { apiCount: onlyModel ? 0 : genApis.length, modelCount };
}
