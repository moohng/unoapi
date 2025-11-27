import { SchemaObject } from 'openapi3-ts/oas30';
import { parseRefKey, parseProperty } from './parse.js';
import type { HTTPMethod, ApiContext, TypeFieldOption, ApiOperationObject, ImportTypeItem } from './types.js';

// Re-export types for backward compatibility
export type { HTTPMethod, ApiContext, TypeFieldOption, ApiOperationObject, ImportTypeItem };

/**
 * 生成类型字段代码
 * @param obj
 * @returns
 */
export function transformTypeFieldCode(obj: TypeFieldOption | string, typeMapping?: Record<string, string>) {
  if (typeof obj === 'string') {
    obj = { name: obj, required: true } as TypeFieldOption;
  }
  const { tsType, refs } = parseProperty(obj.schema, typeMapping);
  let codeStr = `  ${obj.name.replace(/\W/g, '')}${obj.required ? '' : '?'}: ${tsType};`;

  const descriptionComment = obj.description ? ` ${obj.description} ` : '';
  const minLength = (obj.schema as SchemaObject)?.minLength;
  const maxLength = (obj.schema as SchemaObject)?.maxLength;
  const minComment = minLength ? ` 最小长度：${minLength} ` : '';
  const maxComment = maxLength != null ? ` 最大长度：${maxLength} ` : '';
  if (descriptionComment || minComment || maxComment) {
    const comment = `  /**\n   *${descriptionComment}${minComment}${maxComment}\n   */`;
    codeStr = `${comment}\n${codeStr}`;
  }

  return { code: codeStr, refs: refs };
}

/**
 * 通过字段描述生成类型接口代码
 * @param params
 * @param name
 * @returns
 */
export function transformQueryCode(params: TypeFieldOption[], name: string, typeMapping?: Record<string, string>) {
  const codes: string[] = [];
  const allRefs: string[] = [];
  for (const param of params) {
    const { code, refs } = transformTypeFieldCode(param, typeMapping);
    codes.push(code);
    allRefs.push(...refs);
  }
  let codeStr = codes.join('\n');
  codeStr = `export default interface ${name} {\n${codeStr}\n}\n`;
  return { code: codeStr, refs: allRefs };
}

const GENERIC_TYPE_NAMES = ['T', 'E', 'U', 'K', 'V'];

/**
 * 生成模型接口代码
 * @param modelObj 
 * @param refKey 
 * @returns 
 */
export function transformModelCode(modelObj: SchemaObject, refKey: string, typeMapping?: Record<string, string>) {
  const { required, properties, description: objDesc, title } = modelObj as SchemaObject;

  const { typeName, fileName } = parseRefKey(refKey); // 可能是 ResponseDTO<List<ProductBaseVO>>

  let codeStr = `export default interface ${fileName} {\n  // @UNOAPI[${refKey}]\n`;
  if (objDesc || title) {
    codeStr = `/**\n * ${objDesc || title}\n */\n${codeStr}`;
  }

  // 外部引用类型
  const importRefKeys = new Set<string>();
  const refs: string[] = [];
  let genericIndex = -1;

  // 遍历属性
  for (const propKey in properties) {
    // 定义属性
    const property = properties[propKey];

    // 过滤掉一些非法字符 如：key[]、中文、非法字符等
    const parsedKey = propKey.replace(/\W/g, '');
    if (!parsedKey) {
      console.warn('解析到非法字段名', propKey, fileName);
      continue;
    }

    let { tsType, refs: subRefs } = parseProperty(property, typeMapping);
    const isGeneric = typeName.includes(`<${tsType.replace('[]', '')}>`);
    for (const subRef of subRefs) {
      refs.push(subRef);
      if (!isGeneric) {
        importRefKeys.add(subRef.replace('#/components/schemas/', ''));
      }
    }

    // 处理泛型
    if (isGeneric) {
      const isArray = tsType.endsWith('[]');
      tsType = GENERIC_TYPE_NAMES[++genericIndex];
      if (isArray) {
        tsType += '[]';
      }
    }

    const isRequired = required?.includes(propKey);
    let propStr = `  ${parsedKey}${isRequired ? '' : '?'}: ${tsType};\n`;

    // 添加注释
    const { description, minLength, maxLength } = property as SchemaObject;
    const descriptionComment = description ? ` ${description} ` : '';
    const minComment = minLength ? ` 最小长度：${minLength} ` : '';
    const maxComment = maxLength ? ` 最大长度：${maxLength} ` : '';
    if (descriptionComment || minComment || maxComment || parsedKey !== propKey) {
      const comment1 = `${descriptionComment}${minComment}${maxComment}`;
      const commentStr = `  /**\n${comment1 ? `   *${comment1}\n` : ''}${parsedKey !== propKey ? `   * 原始字段名可能有误："${propKey}"\n` : ''}   */`;
      propStr = `${commentStr}\n${propStr}`;
    }

    // 拼接属性
    codeStr += propStr;
  }

  codeStr += '}\n';

  // 处理泛型参数
  if (genericIndex > -1) {
    codeStr = codeStr.replace(`interface ${fileName}`, `interface ${fileName}<${GENERIC_TYPE_NAMES.slice(0, genericIndex + 1).join(', ')}>`);
  }

  // 导入外部类型
  let importStr = '';
  for (const importRefKey of importRefKeys) {
    const { fileName } = parseRefKey(importRefKey);
    if (refKey !== importRefKey) {
      importStr = `${importStr}import ${fileName} from './${fileName}';\n`;
    }
  }
  if (importStr) {
    codeStr = `${importStr}\n${codeStr}`;
  }

  return { code: codeStr, refs, generics: GENERIC_TYPE_NAMES.slice(0, genericIndex + 1) };
}

/**
 * 输出 api 函数代码
 * @param apiContext
 * @returns
 */
export function transformApiCode(apiContext: ApiContext, typeMapping?: Record<string, string>) {
  const { queryType, bodyType, responseType, comment, name, url, method, pathParams } = apiContext;

  let paramStr = bodyType || queryType ? `data: ${bodyType || queryType}` : '';
  let urlStr = `'${url}'`;
  if (pathParams?.length) {
    let codeStr = pathParams.map((item) => transformTypeFieldCode(item, typeMapping))
      .map((item) => item.code.trim())
      .join(' ');
    paramStr = `params: { ${codeStr} }${paramStr ? ', ' + paramStr : ''}`;
    // 转换 url
    const paramUrl = url.replace(/\{(.*?)\}/g, (_, $1) => `\${params.${$1}}`);
    urlStr = `\`${paramUrl}\``;
  }

  const resStr = responseType ? `<${responseType}>` : '';

  let apiFuncStr = `
export function ${name}(${paramStr}) {
  return request${resStr}({ url: ${urlStr},${bodyType || queryType ? ' data,' : ''} method: '${method.toUpperCase()}' });
}
`;

  if (comment) {
    apiFuncStr =
      `
/**
 * ${comment}
 * @UNOAPI[${method}:${url}]
 */` + apiFuncStr;
  } else {
    apiFuncStr =
      `
/**
 * @UNOAPI[${method}:${url}]
 */` + apiFuncStr;
  }

  return apiFuncStr;
}

/**
 * 生成类型索引代码
 * @param imports
 * @returns
 */
export function transformTypeIndexCode(imports: ImportTypeItem[], asGlobal = false) {
  let importStr = '';
  let typeStr = asGlobal ? 'declare global {\n' : 'export {\n';
  const uniqueMap: Record<string, boolean> = {};
  for (const item of imports) {
    if (uniqueMap[item.fileName]) {
      continue;
    }
    if (asGlobal) {
      importStr += `import _${item.fileName} from '${item.path}';\n`;
      const genericStr = item.genericParams?.length ? `<${item.genericParams.join(', ')}>` : '';
      typeStr += `  type ${item.fileName}${genericStr} = _${item.fileName}${genericStr};\n`;
    } else {
      importStr += `import ${item.fileName} from '${item.path}';\n`;
      typeStr += `  ${item.fileName},\n`;
    }
    uniqueMap[item.fileName] = true;
  }
  typeStr += '}\n';

  return importStr + '\n' + typeStr;
}
