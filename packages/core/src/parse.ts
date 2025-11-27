import { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { isBaseType, upperFirst } from './tools.js';

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

  let funcName = '';
  let fileName = '';
  let dirName = '';

  for (let i = urlSplitArr.length - 1; i >= 0; i--) {
    const item = urlSplitArr[i];
    const matched = item.match(/\{(.+)\}|:(.+)/);
    if (matched) {
      const param = matched[1] || matched[2];
      pathStrParams.push(param);
      if (!funcName) {
        funcName = `${urlSplitArr[i - 1]}By${upperFirst(param)}`;
      }
    } else {
      if (!funcName) {
        funcName = item;
      } else if (!fileName) {
        fileName = item;
      } else if (!dirName) {
        dirName = urlSplitArr.slice(0, i + 1).join('/');
      }
    }
  }

  return {
    funcName,
    fileName: fileName || 'index',
    dirName,
    pathStrParams,
  };
}

/**
 * 从 ref 中获取类型名称
 * 去掉后端类型名称中的非法字符，比如：
 * com.xxx.common.dto2.ResponseDTO«List«ActivityListVO对象»»     ======>     ResponseDTO<ActivityListVO[]>
 * com.xxx.common.dto2.ResponseDTO«com.xxx.bff.crp.matter.common.dro.aftersales.order.SubmitAftersaleDRO»    ======>      ResponseDTO<SubmitAftersaleDRO>
 * @param refKey
 */
export function parseRefKey(refKey: string) {
  // 去掉包名 com.xxx.common.dto2.  、非法字符
  const name = refKey
    .replace('#/components/schemas/', '')
    .replace(/[#\w-]+(\.|\/)/g, '')
    .replace(/«/g, '<')
    .replace(/»/g, '>')
    .replace(/[^<>]+/g, (match) => {
      return match.replace(/[^a-zA-Z0-9\[\]]/g, '') || match;
    })
    .replace(/List<(\w+)>/g, '$1[]');

  const fileName = name
    .replace(/\[\]/g, '') // 去掉可能的 []
    .replace(/<.*>/g, ''); // 去掉可能的 <> 包围的类型

  return { typeName: name, fileName };
}

/**
 * 解析类型
 * @param property
 * @param typeMapping
 * @returns
 */
function parseBase(property: string, typeMapping?: Record<string, string>) {
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

  return mergedTypeMapping[property as keyof typeof typeMapping] || 'any';
}

/**
 * 解析 Schema 对象、Reference 对象、字符串类型映射
 * 对 model 中的属性 解析成 ts 类型
 * 输出 { tsType: string, refs: string[] }
 * @param {string | SchemaObject | ReferenceObject} property
 * @param {Record<string, string>} typeMapping 类型映射
 * @returns
 */
export function parseProperty(property?: string | SchemaObject | ReferenceObject, typeMapping?: Record<string, string>) {
  const refs: string[] = [];

  let tsFileName: string | undefined;
  function parse(property?: SchemaObject | ReferenceObject): string {
    // 引用类型
    let ref = (property as ReferenceObject)?.$ref;
    if (ref) {
      ref = decodeURIComponent(ref);
      refs.push(ref);
      const { typeName, fileName } = parseRefKey(ref);
      tsFileName = fileName;
      const parseType = parseBase(typeName, typeMapping);
      return isBaseType(parseType) && parseType !== 'any' ? parseType : typeName;
    }

    // 数组类型
    if ((property as SchemaObject)?.type === 'array') {
      const subType = (property as SchemaObject).items ? parse((property as SchemaObject).items!) : 'any';
      return `${subType}[]`;
    }

    return parseBase((property as SchemaObject)?.type as string, typeMapping);
  }

  if (typeof property === 'string') {
    return { tsType: parseBase(property, typeMapping), refs: [] };
  }

  return {
    tsType: parse(property),
    refs: refs,
    tsFileName,
  };
}
