import { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { formatObjName, isBaseType } from './tools.js';

/**
 * 解析URL路径
 * 从URL路径中解析出api函数名、文件名、目录名、路径参数
 * @param url
 * @returns
 */
export function parseUrl(input: string) {
  // 根据URL路径确定目录结构
  const urlSplitArr = input
    .replace(/[-_](\w)/g, (_, p1) => p1.toUpperCase())
    .replace(/^\//, '')
    .split('/');

  // 路径参数
  const pathStrParams: string[] = [];

  const validUrlSplitArr = urlSplitArr.filter((item) => {
    // 获取path参数
    const matched = item.match(/\{(.+)\}/) || item.match(/:(.+)/);
    if (matched) {
      pathStrParams.push(matched[1]);
    }
    return !matched;
  });

  // api函数名
  const funcName = validUrlSplitArr.pop() || 'index';
  // 文件名
  const fileName = validUrlSplitArr.pop() || 'index';
  // 目录名
  const dirName = validUrlSplitArr.join('/');

  return {
    funcName,
    fileName,
    dirName,
    pathStrParams,
  };
}

/**
 * 解析属性类型
 * @param {string | SchemaObject | ReferenceObject} property
 * @param {Record<string, string>} typeMapping 类型映射
 * @returns
 */
export function parseSchemaObject(property?: string | SchemaObject | ReferenceObject, typeMapping?: Record<string, string>) {
  const mergedTypeMapping = {
    string: 'string',
    integer: 'number',
    int: 'number',
    long: 'number',
    double: 'number',
    float: 'number',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
    ...typeMapping,
  };

  const refs: string[] = [];

  function parse(property?: string | SchemaObject | ReferenceObject): string {
    if (typeof property !== 'string') {
      // 引用类型
      const ref = (property as ReferenceObject)?.$ref;
      if (ref) {
        refs.push(ref);
        const name = formatObjName(ref);
        const parseType = parse(name);
        return isBaseType(parseType) && parseType !== 'any' ? parseType : name;
      }

      // 数组类型
      if ((property as SchemaObject)?.type === 'array') {
        const subType = (property as SchemaObject).items ? parse((property as SchemaObject).items!) : 'any';
        return `${subType}[]`;
      }

      property = (property as SchemaObject)?.type as string;
    }

    return mergedTypeMapping[property as keyof typeof typeMapping] || 'any';
  }

  return {
    type: parse(property),
    refs: refs,
  };
}
