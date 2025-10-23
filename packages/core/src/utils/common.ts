import * as fs from 'fs/promises';

/**
 * 去掉后端对象名中的非法字符
 * 比如：com.xxx.common.dto2.ResponseDTO«List«ActivityListVO对象»»     ======>     ResponseDTO<List<ActivityListVO>>
 * com.xxx.common.dto2.ResponseDTO«com.xxx.bff.crp.matter.common.dro.aftersales.order.SubmitAftersaleDRO»    ======>      ResponseDTO<SubmitAftersaleDRO>
 * @param objName
 * @param keepOuter
 */
export function formatObjName(objName: string) {
  // 去掉包名 com.xxx.common.dto2.  、非法字符
  let name = objName.replace(/[\w-]+(\.|\/)/g, '').replace(/«/g, '<').replace(/»/g, '>')
  name = name.replace(/[^<>]+/g, (match) => {
    return match.replace(/[^a-zA-Z0-9]/g, '') || match;
  });
  return name;
}

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
export async function existsPath(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
