import { OperationObject, ParameterObject, SchemaObject } from 'openapi3-ts/oas30';

/**
 * HTTP 方法类型
 */
export type HTTPMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

/**
 * 类型字段选项
 */
export type TypeFieldOption = Omit<ParameterObject, 'in'>;

/**
 * 解析后的 API 操作对象
 */
export interface ApiOperationObject extends OperationObject {
  path: string;
  method: HTTPMethod;
}

/**
 * Api 代码上下文
 */
export interface ApiContext {
  api: ApiOperationObject;
  name: string;
  url: string;
  method: HTTPMethod;
  comment?: string;
  pathParams?: TypeFieldOption[];
  queryType?: string;
  bodyType?: string;
  responseType?: string;
  refs?: string[];
}

/**
 * 导入类型项
 */
export interface ImportTypeItem {
  fileName: string;
  path: string;
}

/**
 * 生成的代码基础接口
 */
export interface GenerateCode {
  sourceCode: string;
  /** 文件名称 abc */
  fileName: string;
  /** 文件全名称 abc.ts */
  fileFullName: string;
  /** 文件相对目录 users */
  fileDir: string;
  /** 文件相对路径 users/abc.ts */
  filePath: string;
}

/**
 * 生成的模型
 */
export interface GenerateModel extends GenerateCode {
  /** 类型名称 */
  typeName: string;
}

/**
 * 生成的 API
 */
export interface GenerateApi extends GenerateCode {
  /** api 模型引用 */
  refs?: string[];
  /** 生成模型 */
  getModels: (schemas: ModelSchemaCollection) => GenerateModel[];
}

/**
 * 模型 Schema 集合
 */
export interface ModelSchemaCollection {
  [schema: string]: SchemaObject | import('openapi3-ts/oas30').ReferenceObject;
}
