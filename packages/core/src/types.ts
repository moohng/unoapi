import { ParameterObject } from "openapi3-ts/oas30";

export type HTTPMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

/**
 * UnoAPI 上下文
 */
export interface UnoContext {
  sourceCode?: string;
  /** 默认取URL最后一段 */
  name: string;
  url: string;
  method: HTTPMethod;
  comment?: string;
  pathParams?: TypeFieldOption[];
  queryType?: string;
  bodyType?: string;
  responseType?: string;
}

/**
 * 类型字段选项
 */
export type TypeFieldOption = Omit<ParameterObject, 'in'>;

export interface SchemaProperty {
  type?: 'string' | 'integer' | 'boolean' | 'object' | 'array';
  items?: SchemaProperty,
  description?: string;
  $ref?: string;
}

/**
 * 生成的代码上下文
 */
export interface GenerateCodeContext {
  sourceType: 'api' | 'model';
  sourceCode: string;
  /** 函数名称 */
  funcName?: string;
  /** 类型名称 Abc */
  typeName?: string;
  /** 文件名称 abc.ts */
  fileName: string;
  /** 文件相对目录 users */
  fileDir?: string;
  /** 文件相对路径 users/abc.ts */
  filePath?: string;
}
