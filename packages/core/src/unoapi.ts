import { OpenAPIObject, OperationObject, ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject, SchemaObjectType } from 'openapi3-ts/oas30';
import { UnoConfig } from './config/index.js';
import { parseSchemaObject, parseUrl } from './utils/parse.js';
import { GenerateCodeContext, HTTPMethod, TypeFieldOption, UnoContext } from './types.js';
import { formatObjName, upperFirst } from './utils/common.js';
import { transformTypeInterfaceCode, transformApiCode } from './utils/transform.js';

interface ParsedApi extends OperationObject {
  url: string;
  method: HTTPMethod;
}

interface GenerateArgs {
  method?: string; // HTTP 方法
  output?: string; // 输出目录
  funcName?: string; // 自定义函数名称
}

class UnoAPI {
  private config: UnoConfig; // 配置项
  private rawData: OpenAPIObject[] = []; // 文档原始数据
  private parsedApis: ParsedApi[] = []; // 解析后的数据

  private urls = new Set<string>(); // 需要生成代码的接口 URL

  private generateType?: 'api' | 'model'; // 生成代码的类型

  private refs = new Set<string>(); // 需要生成代码的模型名称

  private writeHandler(codeContext: GenerateCodeContext): void | Promise<void> {
    console.log('在这里写入文件，默认什么都不做', codeContext);
  }

  constructor(config: UnoConfig) {
    this.config = config;
  }

  async parseData() {
    let { cacheFile } = this.config;
    console.log('加载文档数据，从缓存文件读取：', cacheFile);

    try {
      // 预留多JSON文档支持
      const doc = require(cacheFile) as OpenAPIObject;
      this.rawData = [doc];
      // console.log('加载文档数据成功', this.rawData);
    } catch (error) {
      console.error('加载文档数据失败，请先运行 unoapi update 命令生成文档数据', error);
      this.rawData = [];
      this.parsedApis = [];
    }

    this.rawData.forEach((doc) => {
      if (doc?.paths) {
        Object.entries(doc.paths).forEach(([url, pathItem]) => {
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as HTTPMethod[];
          methods.forEach((method) => {
            const apiObj = (pathItem as any)[method] as OperationObject | undefined;
            if (!apiObj) {
              return;
            }
            this.parsedApis.push({
              url,
              method,
              ...apiObj,
            });
          });
        });
      }
    });

    return this;
  }

  private addRefs(ref: string) {
    console.log('添加引用模型：', ref);
    this.refs.add(ref);
  }

  api(urls: string[]) {
    if (this.generateType === 'model') {
      throw new Error('model() 和 api() 不能同时调用');
    }
    this.generateType = 'api';
    this.urls = new Set([...this.urls, ...urls]);
    return this;
  }

  model(urls: string[]) {
    if (this.generateType === 'api') {
      throw new Error('api() 和 model() 不能同时调用');
    }
    this.generateType = 'model';
    this.urls = new Set([...this.urls, ...urls]);
    return this;
  }

  on(writeHandler: (codeContext: GenerateCodeContext) => void | Promise<void>) {
    this.writeHandler = writeHandler;
    return this;
  }

  async start(args: GenerateArgs) {
    if (this.urls.size === 0) {
      // 生成所有
      for (const item of this.parsedApis) {
        await this.generateSingleApiCode(item, args);
      }
    } else {
      for (const url of this.urls) {
        const result = url.split(' ');
        let method: string;
        let parsedUrl = url;
        if (result.length > 1) {
          method = result[0].replace(/[[\]]/g, '').toLowerCase();
          parsedUrl = result[1];
        }
        const matched = this.parsedApis.filter((item) => item.url === parsedUrl && (!method || item.method === method));
        if (matched.length) {
          for (const item of matched) {
            await this.generateSingleApiCode(item, args);
          }
        } else {
          console.warn('未找到匹配的接口：', url);
        }
      }
      this.urls.clear();
    }
  }

  private async generateSingleApiCode(parsedApi: ParsedApi, args: GenerateArgs) {
    console.log('生成单个API代码', parsedApi, args);

    const { funcName: defaultFuncName, fileName: fileNameWithoutExt, dirName, pathStrParams } = parseUrl(parsedApi.url);
    const funcName = args.funcName || defaultFuncName;

    const pathParams: TypeFieldOption[] = pathStrParams.map((name) => ({
      name,
      type: 'string',
      required: true,
    }));

    // 入参
    let queryTypeName: string | undefined;
    let bodyTypeName: string | undefined;
    if (parsedApi.requestBody) {
      const reqBody = parsedApi.requestBody;
      const bodyRef = (reqBody as ReferenceObject).$ref;
      if (bodyRef) {
        bodyTypeName = await parseSchemaObject(reqBody as ReferenceObject, this.addRefs.bind(this));
      } else if ((reqBody as RequestBodyObject)?.content) {
        const mediaType = Object.keys((reqBody as RequestBodyObject).content)[0];
        const schema = (reqBody as RequestBodyObject).content[mediaType].schema;
        bodyTypeName = await parseSchemaObject(schema, this.addRefs.bind(this));
      }
    }

    if (parsedApi.parameters?.length) {
      const queryParams: ParameterObject[] = [];
      for (const param of parsedApi.parameters as (ParameterObject)[]) {
        if (param.in === 'path') {
          const _param = param as ParameterObject;
          const idx = pathParams.findIndex((item) => item.name === _param.name);
          if (idx > -1) {
            pathParams[idx].description = _param.description;
            pathParams[idx].schema = {
              type: await parseSchemaObject(_param.schema || 'string') as SchemaObjectType,
            }
          }
        } else if (param.in === 'query') {
          queryParams.push(param);
        }
        // 忽略: header、cookie 参数
      }

      // 生成 query 类型
      if (queryParams.length) {
        queryTypeName = `${upperFirst(fileNameWithoutExt)}${upperFirst(funcName)}Query`;
        const code = await transformTypeInterfaceCode(queryParams, queryTypeName, this.addRefs.bind(this));
        const queryFileName = `${queryTypeName}.ts`;
        const queryFileDir = (dirName ? dirName + '/' : '') + 'query';
        await this.writeHandler({
          sourceType: 'model',
          sourceCode: code,
          typeName: queryTypeName,
          fileName: queryFileName,
          fileDir: queryFileDir,
          filePath: `${queryFileDir}/${queryFileName}`,
        });
      }
    }

    // 出参
    let responseTypeName = 'any';
    for (const key in parsedApi.responses) {
      if (key.startsWith('2')) {
        const resp = parsedApi.responses[key] as ResponseObject;
        if (resp.content) {
          const mediaType = Object.keys(resp.content)[0];
          const schema = resp.content[mediaType].schema;
          if (schema) {
            responseTypeName = await parseSchemaObject(schema, this.addRefs.bind(this));
          }
        }
        break;
      }
    }

    if (this.generateType === 'api') {
      // 构建 API 上下文
      let apiContext: UnoContext = {
        url: parsedApi.url,
        method: parsedApi.method,
        name: funcName,
        pathParams,
        queryType: queryTypeName,
        bodyType: bodyTypeName,
        responseType: responseTypeName,
        comment: parsedApi.summary || parsedApi.description || '',
      };

      const { funcTpl } = this.config;
      if (typeof funcTpl === 'function') {
        const result = await funcTpl(apiContext);
        console.log('自定义函数模板', result);
        if (typeof result === 'string') {
          apiContext.sourceCode = result;
        } else if (result.sourceCode) {
          apiContext = { ...apiContext, ...result };
        } else {
          apiContext.sourceCode = await transformApiCode(apiContext);
        }
      } else {
        apiContext.sourceCode = await transformApiCode(apiContext);
      }

      const fileName = `${fileNameWithoutExt}.ts`;
      const filePath = (dirName ? dirName + '/' : '') + fileName;
      await this.writeHandler({
        sourceType: 'api',
        sourceCode: apiContext.sourceCode!,
        fileName,
        fileDir: dirName,
        filePath,
        funcName,
      });
    }
    console.log('当前引用的模型：', this.refs);
    const fileDir = (dirName ? dirName + '/' : '') + 'model';
    for (const key of this.refs) {
      await this.generateModelCode(
        key,
        async (codeContext) => await this.writeHandler({
          ...codeContext,
          sourceType: 'model',
          fileDir,
          filePath: `${fileDir}/${codeContext.fileName}`,
        })
      );
    }
  }

  /**
   * 生成类型定义
   * @param ref
   * @param aliasName
   * @returns
   */
  private async generateModelCode(
    ref: string,
    receiveHandler: (result: GenerateCodeContext) => void | Promise<void>
  ) {
    let refKey = ref.replace('#/components/schemas/', '');
    // 忽略一些类型：List等
    ['List'].forEach((ignoreType) => {
      refKey = refKey.match(new RegExp(`${ignoreType}«(.+)»`))?.[1] || refKey;
    });

    let modelObj: SchemaObject | ReferenceObject | undefined;
    for (const doc of this.rawData) {
      modelObj = doc.components?.schemas?.[refKey];
      if (modelObj) {
        break;
      }
    }
    if (!modelObj) {
      throw new Error(`${refKey} 不存在！`);
    }

    if ((modelObj as ReferenceObject).$ref) {
      this.generateModelCode((modelObj as ReferenceObject).$ref, receiveHandler);
      return;
    }

    // 对象名称
    let objName = formatObjName(refKey);

    // 去掉泛型（尖括号里面的类型）
    const idx = objName.indexOf('<');
    if (idx > -1) {
      objName = objName.substring(0, idx);
    }

    const { required, properties, description: objDesc } = modelObj as SchemaObject;

    if (!objName || !properties || /^[a-z]/.test(objName)) {
      return;
    }

    // 拼接代码
    let codeStr = `export default interface ${objName} {\n  // @NOAPI[${refKey}]\n`;
    if (objDesc) {
      codeStr = `/** ${objDesc} */\n${codeStr}`;
    }

    const importRefKeys = new Set<string>();

    // 遍历属性
    for (const propKey in properties) {
      // 定义属性
      const property = properties[propKey];

      let tsType = await parseSchemaObject(property, (subRef) => {
        this.addRefs.bind(this)(subRef);
        importRefKeys.add(subRef.replace('#/components/schemas/', ''));
      });

      // 导入外部类型
      for (const importRefKey of importRefKeys) {
        const importType = formatObjName(importRefKey);
        const importStr = `import ${importType} from './${importType}'`;
        if (!codeStr.includes(importStr) && refKey !== importRefKey) {
          codeStr = `${importStr};\n${codeStr.includes('import') ? '' : '\n'}${codeStr}`;
        }
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

    const fileName = `${objName}.ts`;

    await receiveHandler({
      sourceType: 'model',
      sourceCode: codeStr,
      typeName: objName,
      fileName,
    });
  }
}

export async function createUnoAPI(config: UnoConfig) {
  return await new UnoAPI(config).parseData();
}
