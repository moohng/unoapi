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