import * as fs from 'fs/promises';
import { parseRefKey } from './parse';

/**
 * 是否是基本类型
 * @param type
 */
export function isBaseType(type: string) {
  return ['string', 'number', 'boolean', 'object', 'any', 'unknown'].includes(type);
}

/**
 * 首字母大写
 * @param str
 * @returns
 */
export function upperFirst(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 判断路径是否存在
 * @param filePath
 * @returns
 */
export async function existsPath(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 判断两个字符串是否近似相等，忽略大小写
 * @param str1
 * @param str2
 * @returns
 */
export function isSimilar(str1?: string, str2?: string) {
  return str1?.toLocaleLowerCase() === str2?.toLocaleLowerCase();
}

/**
 * 判断是否允许生成
 * @param name
 * @param ignores
 * @returns
 */
export function isAllowGenerate(name?: string, ignores?: (string | RegExp)[]) {
  return !!name && !ignores?.some(i => {
    if (i instanceof RegExp) {
      return i.test(name);
    }
    if (name.startsWith('#') || name.indexOf('/') === -1) {
      const { fileName } = parseRefKey(name);
      return fileName === i;
    }
    return name === i;
  })
};

/**
 * 获取允许生成的类型名称
 * @param tsType
 * @param ignores
 * @returns
 */
export function getAllowTypeName(tsType: string, ignores?: (string | RegExp)[]): string {
  const matched = tsType.match(/([^<>\[\]]+)<(.+)>/) || tsType.match(/([^<>\[\]]+)\[\]/);
  let name;
  if (matched) {
    name = matched[1];
  } else {
    name = tsType;
  }
  if (isAllowGenerate(name, ignores)) {
    return tsType;
  }
  return matched?.[2] ? getAllowTypeName(matched?.[2], ignores) : '';
};

/**
 * 判断路径是否是目录
 * @param path
 * @returns
 */
export async function isDirectory(path: string) {
  try {
    return (await fs.stat(path)).isDirectory();
  } catch {
    return path.endsWith('/') || !path.split('.')[1];
  }
}