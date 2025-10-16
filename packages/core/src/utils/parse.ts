import { SchemaProperty } from "../types";
import { formatObjName, isBaseType } from "./common";

/**
 * 解析URL路径
 * 从URL路径中解析出api函数名、文件名、目录名、路径参数
 * @param url
 * @returns
 */
export function parseUrl(input: string) {
  // 根据URL路径确定目录结构
  const urlSplitArr = input.replace(/[-_](\w)/g, (_, p1) => p1.toUpperCase()).replace(/^\//, '').split('/');

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
  const fileName = validUrlSplitArr.pop() || 'common';
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
 * @param {SchemaProperty} property
 * @param {Record<string, string>} typeMapping 类型映射表 { string: 'string', integer: 'number', ... }
 * @returns
 */
export function parseToTsType(
  property?: string | SchemaProperty,
  typeMapping?: Record<string, string>
): string {
  if (typeof property !== 'string') {
    // 数组类型
    if (property?.type === 'array') {
      const subType = property.items ? parseToTsType(property.items, typeMapping) : 'any';
      return `${subType}[]`;
    }

    // 引用类型
    if (property?.$ref) {
      const name = formatObjName(property.$ref);
      const parseType = parseToTsType(name, typeMapping);
      return isBaseType(parseType) && parseType !== 'any' ? parseType : name;
    }

    property = property?.type;
  }

  const map = {
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

  return map[property as keyof typeof map] || 'any';
}