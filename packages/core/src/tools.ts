import * as fs from 'fs/promises';

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
