import { ReferenceObject, SchemaObject } from 'openapi3-ts/oas30';
import { parseRefKey, parseProperty } from './parse.js';
import type { ApiContext, ImportItem, TypeFieldOption } from './types.js';

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

  let descriptionComment = '';
  if (obj.description) {
    descriptionComment = obj.description.split('\n').map(line => line.trim()).filter(Boolean).map((line) => `   * ${line}`).join('\n');
  }
  const minLength = (obj.schema as SchemaObject)?.minLength;
  const maxLength = (obj.schema as SchemaObject)?.maxLength;
  const minComment = minLength ? `   * 最小长度：${minLength}` : '';
  const maxComment = maxLength != null ? `   * 最大长度：${maxLength}` : '';
  if (descriptionComment || minComment || maxComment) {
    const comment = `  /**\n${[descriptionComment, minComment, maxComment].filter(Boolean).join('\n')}\n   */`;
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
  const { description: objDesc, title } = modelObj;

  const { typeName, fileName } = parseRefKey(refKey); // 可能是 ResponseDTO<List<ProductBaseVO>>

  let codeStr = `export default interface ${fileName} {\n  // @UNOAPI[${refKey}]\n`;
  if (objDesc || title) {
    codeStr = `/**\n * ${objDesc || title}\n */\n${codeStr}`;
  }

  // 外部引用类型
  const importRefKeys = new Set<string>();
  const refs: string[] = [];
  let genericIndex = -1;

  // 层级
  let level = 0;

  // 遍历属性拼接
  function joinPropertyCode(schemaObj: SchemaObject) {
    level++;
    const space = ' '.repeat(level * 2);

    let codeStr = '';

    for (const propKey of Object.keys(schemaObj.properties || {})) {
      const property = schemaObj.properties?.[propKey];

      // 检测到非法字符
      const canInvalid = /[^\w]/.test(propKey);
      if (canInvalid) {
        console.warn('解析到非法字段名', propKey, fileName);
      }

      let { tsType, refs: subRefs } = parseProperty(property, typeMapping);

      if (tsType === 'object') {
        const code = joinPropertyCode(property as SchemaObject);
        tsType = code ? `{
${code}${space}}` : tsType;
      } else if (tsType === 'object[]') {
        const code = joinPropertyCode((property as SchemaObject).items as SchemaObject);
        tsType = code ? `{
${code}${space}}[]` : tsType;
      } else {
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
      }

      const isRequired = schemaObj?.required?.includes(propKey);
      let propStr = `${space}${canInvalid ? `'${propKey}'` : propKey}${isRequired ? '' : '?'}: ${tsType};\n`;

      // 添加注释
      const { description, minLength, maxLength } = property as SchemaObject;
      let descriptionComment = '';
      if (description) {
        descriptionComment = description.split('\n').map(line => line.trim()).filter(Boolean).map((line) => `${space} * ${line}`).join('\n');
      }
      const minComment = minLength ? `${space} * 最小长度：${minLength}` : '';
      const maxComment = maxLength ? `${space} * 最大长度：${maxLength}` : '';
      if (descriptionComment || minComment || maxComment || canInvalid) {
        const commentLines = [descriptionComment, minComment, maxComment, canInvalid ? `${space} * WARM: 字段名可能有误` : ''].filter(Boolean);
        const commentStr = `${space}/**\n${commentLines.join('\n')}\n${space} */`;
        propStr = `${commentStr}\n${propStr}`;
      }

      // 拼接属性
      codeStr += propStr;
    }
    level--;

    return codeStr;
  }

  const propertyCode = joinPropertyCode(modelObj);

  codeStr += propertyCode + '}\n';

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

  let paramStr = [
    queryType ? `query: ${queryType}` : '',
    bodyType ? `data: ${bodyType}` : ''
  ].filter(Boolean).join(', ');

  let urlStr = `'${url}'`;
  if (pathParams?.length) {
    let codeStr = pathParams.map((item) => transformTypeFieldCode(item, typeMapping).code).join('\n');
    paramStr = `params: {\n${codeStr}\n}${paramStr ? ', ' + paramStr : ''}`;
    // 转换 url
    const paramUrl = url.replace(/\{(.*?)\}/g, (_, $1) => `\${params.${$1}}`);
    urlStr = `\`${paramUrl}\``;
  }

  const resStr = responseType ? `<${responseType}>` : '';

  // 拼接函数
  const funcLines = [
    `export function ${name}(${paramStr}) {`,
    `  return request${resStr}({`,
    `    url: ${urlStr},`,
    `    method: '${method.toUpperCase()}',`,
    `    ${queryType ? 'query,' : ''}`,
    `    ${bodyType ? 'data,' : ''}`,
    `  });`,
    `}`
  ].filter(line => line.trim());

  // 添加注释
  const commentLines = [
    `/**`,
    ...(comment?.split('\n').map(line => line.trim()).filter(Boolean).map(line => ` * ${line}`) || []),
    ` * @UNOAPI[${method}:${url}]`,
    ` */`
  ];

  return [...commentLines, ...funcLines].join('\n');
}

/**
 * 生成类型索引代码
 * @param imports
 * @returns
 */
export function transformTypeIndexCode(imports: ImportItem[]) {
  let importStr = '';
  let typeStr = 'export {\n';
  const uniqueMap: Record<string, boolean> = {};
  for (const item of imports) {
    if (typeof item !== 'string') {
      if (uniqueMap[item.defaultName!]) {
        continue;
      }
      importStr += `import ${item.defaultName!} from '${item.path}';\n`;
      typeStr += `  ${item.defaultName!},\n`;
      uniqueMap[item.defaultName!] = true;
    }
  }
  typeStr += '}\n';

  return importStr + '\n' + typeStr;
}
