import { SchemaObject } from 'openapi3-ts/oas30';
import { parseSchemaObject } from './parse.js';
import { formatObjName } from './tools.js';
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
  const { type: tsType, refs } = parseSchemaObject(obj.schema, typeMapping);
  let codeStr = `  ${obj.name.replace(/\W/g, '')}${obj.required ? '' : '?'}: ${tsType};`;

  const descriptionComment = obj.description ? ` ${obj.description} ` : '';
  const minLength = (obj.schema as SchemaObject)?.minLength;
  const maxLength = (obj.schema as SchemaObject)?.maxLength;
  const minComment = minLength ? ` 最小长度：${minLength} ` : '';
  const maxComment = maxLength != null ? ` 最大长度：${maxLength} ` : '';
  if (descriptionComment || minComment || maxComment) {
    const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
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

/**
 * 生成模型接口代码
 * @param modelObj 
 * @param refKey 
 * @returns 
 */
export function transformModelCode(modelObj: SchemaObject, refKey: string, typeMapping?: Record<string, string>) {
  const { required, properties, description: objDesc } = modelObj as SchemaObject;

  let objName = formatObjName(refKey);
  let codeStr = `export default interface ${objName} {\n  // @UNOAPI[${refKey}]\n`;
  if (objDesc) {
    codeStr = `/** ${objDesc} */\n${codeStr}`;
  }

  // 外部引用类型
  const importRefKeys = new Set<string>();
  const refs: string[] = [];

  // 遍历属性
  for (const propKey in properties) {
    // 定义属性
    const property = properties[propKey];

    let { type: tsType, refs: subRefs } = parseSchemaObject(property, typeMapping);
    for (const subRef of subRefs) {
      refs.push(subRef);
      importRefKeys.add(subRef.replace('#/components/schemas/', ''));
    }

    const isRequired = required?.includes(propKey);
    // 过滤掉一些非法字符 如：key[]
    let propStr = `  ${propKey.replace(/\W/g, '')}${isRequired ? '' : '?'}: ${tsType};\n`;

    // 添加注释
    const { description, minLength, maxLength } = property as SchemaObject;
    const descriptionComment = description ? ` ${description} ` : '';
    const minComment = minLength ? ` 最小长度：${minLength} ` : '';
    const maxComment = maxLength ? ` 最大长度：${maxLength} ` : '';
    if (descriptionComment || minComment || maxComment) {
      const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
      propStr = `${comment}\n${propStr}`;
    }

    // 拼接属性
    codeStr += propStr;
  }

  codeStr += '}\n';

  // 导入外部类型
  let importStr = '';
  for (const importRefKey of importRefKeys) {
    const importType = formatObjName(importRefKey);
    if (refKey !== importRefKey) {
      importStr = `${importStr}import ${importType} from './${importType}';\n`;
    }
  }
  if (importStr) {
    codeStr = `${importStr}\n${codeStr}`;
  }

  return { code: codeStr, refs };
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
    if (uniqueMap[item.typeName]) {
      continue;
    }
    if (asGlobal) {
      importStr += `import _${item.typeName} from '${item.path}';\n`;
      typeStr += `  type ${item.typeName} = _${item.typeName};\n`;
    } else {
      importStr += `import ${item.typeName} from '${item.path}';\n`;
      typeStr += `  ${item.typeName},\n`;
    }
    uniqueMap[item.typeName] = true;
  }
  typeStr += '}\n';

  return importStr + '\n' + typeStr;
}
