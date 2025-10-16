/**
 * UnoAPI 上下文
 */
export interface UnoAPIContext {
  sourceCode?: string;
  /** 默认取URL最后一段 */
  name: string;
  url: string;
  method: string;
  inType?: string;
  outType?: string;
  comment?: string;
  pathParams?: TypeFieldOption[];
}

/**
 * 类型字段选项
 */
export interface TypeFieldOption {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
}

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
  /** abc.ts */
  fileName: string;
  /** d:\workspaces\unoapi\src\api */
  fileDir?: string;
  /** d:\workspaces\unoapi\src\api\abc.ts */
  filePath?: string;
}
