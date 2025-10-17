import { SchemaProperty, TypeFieldOption } from '../types.js';
import { parseToTsType } from './parse.js';

/**
 * 生成类型字段代码
 * @param obj
 * @returns
 */
export function transformTypeFieldCode(obj: TypeFieldOption | string) {
  if (typeof obj === 'string') {
    obj = { name: obj, required: true };
  }
  const tsType = parseToTsType(obj as SchemaProperty);
  let codeStr = `  ${obj.name.replace(/\W/g, '')}${obj.required ? '' : '?'}: ${tsType};`;

  const descriptionComment = obj.description ? ` ${obj.description} ` : '';
  const minComment = obj.minLength != null ? ` 最小长度：${obj.minLength} ` : '';
  const maxComment = obj.maxLength != null ? ` 最大长度：${obj.maxLength} ` : '';
  if (descriptionComment || minComment || maxComment) {
    const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
    codeStr = `${comment}\n${codeStr}`;
  }

  return codeStr;
}
