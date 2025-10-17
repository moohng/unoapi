import * as path from 'path';
import { getDefaultCacheFile, UnoAPIConfig, DEFAULT_OUTPUT } from './config/index.js';
import { parseUrl } from './utils/parse.js';
import { GenerateCodeContext, TypeFieldOption, UnoAPIContext } from './types.js';
import { printDefaultApi } from './utils/print.js';

interface ParsedApi {
  url: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

interface GenerateArgs {
  method?: string; // HTTP 方法
  output?: string; // 输出目录
  funcName?: string; // 自定义函数名称
}

class UnoAPI {
  private config: UnoAPIConfig; // 配置项
  private rawData: any[] = []; // 文档原始数据
  private parsedApis: ParsedApi[] = []; // 解析后的数据

  private urls: Set<string> = new Set(); // 需要生成代码的接口 URL

  private generateType?: 'api' | 'model'; // 生成代码的类型
  private cacheModels: string[] = []; // 需要生成代码的模型名称

  private receiveHandler(codeContext: GenerateCodeContext): void | Promise<void> {
    console.log('开始写入代码...');
  }

  constructor(config: UnoAPIConfig) {
    this.config = config;
    // 加载文档数据
    this.parseData();
  }

  private get apiOutput() {
    let { output } = this.config;
    if (Array.isArray(output)) {
      output = output[0];
    }
    return path.join(process.cwd(), output || DEFAULT_OUTPUT);
  }

  private get modelOutput() {
    let { output } = this.config;
    if (Array.isArray(output)) {
      return path.join(process.cwd(), output[1]);
    }
  }

  private async parseData() {
    let { cacheFile } = this.config;
    cacheFile = cacheFile || getDefaultCacheFile(this.apiOutput);
    console.log('加载文档数据，从缓存文件读取：', cacheFile);

    try {
      // 预留多JSON文档支持
      this.rawData = [require(cacheFile)];
      // console.log('加载文档数据成功', this.rawData);
    } catch (error) {
      console.error('加载文档数据失败，请先运行 unoapi update 命令生成文档数据', error);
      this.rawData = [];
      this.parsedApis = [];
    }

    this.rawData.forEach(doc => {
      if (doc?.paths) {
        Object.keys(doc.paths).forEach((url) => {
          Object.keys(doc.paths[url]).forEach(method => {
            const apiObj = doc.paths[url][method];
            this.parsedApis.push({
              url,
              method,
              ...apiObj,
            });
          });
        });
      }
    });
  }

  getUrlList(keywords?: string) {
    if (!keywords) {
      return this.parsedApis.map(item => `[${item.method.toUpperCase()}] ${item.url} ${item.summary}`);
    }
    return this.parsedApis.filter(item => {
      return item.url.includes(keywords) || (item.summary && item.summary.includes(keywords)) || (item.description && item.description.includes(keywords));
    }).map(item => `[${item.method.toUpperCase()}] ${item.url} ${item.summary}`);
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

  on(receiveHandler: (codeContext: GenerateCodeContext) => void | Promise<void>) {
    this.receiveHandler = receiveHandler;
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
        const matched = this.parsedApis.filter(item => item.url === parsedUrl && (!method || item.method === method));
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

    const pathParams: TypeFieldOption[] = pathStrParams.map(name => ({
      name,
      required: true,
    }));

    // 入参
    let inTypeName = 'any';
    if (parsedApi.parameters) {
      for (const param of parsedApi.parameters) {
        if (param.in === 'path') {
          const idx = pathParams.findIndex((item) => item.name === param.name);
          if (idx > -1) {
            pathParams[idx].description = param.description;
            pathParams[idx].type = param.schema?.type || 'string';
          }
        }
      }
    }

    // 出参
    let outTypeName = 'any';
    if (parsedApi.responses?.['200']) {
      
    }

    if (this.generateType === 'api') {
      // 构建 API 上下文
      let apiContext: UnoAPIContext = {
        url: parsedApi.url,
        method: parsedApi.method,
        name: funcName,
        pathParams,
        inType: inTypeName,
        outType: outTypeName,
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
          apiContext.sourceCode = printDefaultApi(apiContext);
        }
      } else {
        apiContext.sourceCode = printDefaultApi(apiContext);
      }
      console.log('生成的代码：', apiContext.sourceCode);

      const fileName = `${fileNameWithoutExt}.ts`;
      const filePath = (dirName ? dirName + '/' : '') + fileName;
      await this.receiveHandler({
        sourceType: 'api',
        sourceCode: apiContext.sourceCode!,
        fileName,
        fileDir: dirName,
        filePath,
        funcName,
      });
    }

    const fileDir = (dirName ? dirName + '/' : '') + 'model';
    // for (let key of defTodo) {
    //   await this.printDefinitionCode(
    //     { key },
    //     async (codeContext) => await this.receiveHandler({
    //       sourceType: 'model',
    //       ...codeContext,
    //       fileDir,
    //       filePath: `${fileDir}/${codeContext.fileName}`,
    //     })
    //   );
    // }
  }

  /**
   * 生成类型定义
   * @param definitionKey
   * @param aliasName
   * @returns
   */
  // private async printDefinitionCode(
  //   { key, typeName }: PrintDefinitionCodeOption,
  //   receiveHandler: (result: GenerateDefinitionResult) => void | Promise<void>
  // ) {
  //   let definitionKey = key;
  //   // 忽略一些类型：List等
  //   ['List'].forEach((ignoreType) => {
  //     definitionKey = definitionKey.match(new RegExp(`${ignoreType}«(.+)»`))?.[1] || definitionKey;
  //   });

  //   const definitionCollection = this.swagJson!.definitions![definitionKey];
  //   if (!definitionCollection) {
  //     throw new Error(`${definitionKey} 不存在！`);
  //   }

  //   // 对象名称
  //   let objName = typeName || formatObjName(definitionKey);

  //   // 去掉泛型（尖括号里面的类型）
  //   const idx = objName.indexOf('<');
  //   if (idx > -1) {
  //     objName = objName.substring(0, idx);
  //   }

  //   const { required, properties, description: objDesc } = definitionCollection;

  //   if (!objName || !properties || /^[a-z]/.test(objName)) {
  //     return;
  //   }

  //   const { ignoreTypes, matchTypes, typeMapping } = this.config;
  //   // 过滤一些不合法类型
  //   if (
  //     ignoreTypes?.some((item) => (item instanceof RegExp ? item.test(definitionKey) : item === objName)) ||
  //     (matchTypes && !matchTypes.some((match) => (match instanceof RegExp ? match.test(definitionKey) : match === objName)))
  //   ) {
  //     // 是否有子类型
  //     const subDefs = Object.values(properties).filter((item) => item.$ref || item.items?.$ref)?.map((item) => (item.$ref || item.items?.$ref).replace('#/definitions/', '')) || [];
  //     for (const subDef of subDefs) {
  //       await this.printDefinitionCode({ key: subDef }, receiveHandler);
  //     }
  //     return;
  //   }

  //   this.defKeyDone.add(definitionKey);

  //   // 拼接代码
  //   let codeStr = `export default interface ${objName} {\n  // @NOAPI[${definitionKey}]\n`;
  //   if (objDesc) {
  //     codeStr = `/** ${objDesc} */\n${codeStr}`;
  //   }

  //   let genericIndex = -1;
  //   const refList: string[] = [];
  //   const genericTypes: string[] = [];

  //   // 遍历属性
  //   for (const propKey of Object.keys(properties)) {
  //     // 定义属性
  //     const property = properties[propKey];

  //     let tsType;

  //     // 引用类型，递归生成
  //     const hasRef = property.$ref || property.items?.$ref;
  //     if (hasRef) {
  //       const subDefinitionKey = hasRef.replace('#/definitions/', '');
  //       // FIXME: 可能造成死循环
  //       console.log('递归生成', this.defKeyDone, subDefinitionKey, this.defKeyDone.has(subDefinitionKey));
  //       if (this.defKeyDone.has(subDefinitionKey)) {
  //         tsType = parseToTsType(property, typeMapping);
  //       } else {
  //         await this.printDefinitionCode({ key: subDefinitionKey }, receiveHandler);

  //         // 泛型
  //         if (definitionKey.includes(`«${subDefinitionKey}»`)) {
  //           if (!refList.includes(hasRef)) {
  //             refList.push(hasRef);
  //             tsType = GENERIC_TYPE_NAMES[++genericIndex];
  //             genericTypes.push(tsType);
  //           } else {
  //             tsType = GENERIC_TYPE_NAMES[genericIndex];
  //           }
  //         } else {
  //           tsType = formatObjName(subDefinitionKey);
  //         }

  //         tsType += property.items?.$ref ? '[]' : '';
  //       }

  //       // 导入外部类型，泛型不导入
  //       const importType = tsType.replace(/\W/g, '');
  //       if (genericTypes.indexOf(importType) === -1) {
  //         const importStr = `import ${importType} from './${importType}'`;
  //         if (!codeStr.includes(importStr) && definitionKey !== subDefinitionKey) {
  //           codeStr = `${importStr};\n${codeStr.includes('import') ? '' : '\n'}${codeStr}`;
  //         }
  //       }
  //     } else {
  //       tsType = parseToTsType(property, typeMapping);
  //     }

  //     const isRequired = required?.includes(propKey);
  //     // 过滤掉一些非法字符 如：key[]
  //     let propStr = `  ${propKey.replace(/\W/g, '')}${isRequired ? '' : '?'}: ${tsType};\n`;

  //     // 添加注释
  //     const descriptionComment = property.description ? ` ${property.description} ` : '';
  //     const minComment = property.minLength != null ? ` 最小长度：${property.minLength} ` : '';
  //     const maxComment = property.maxLength != null ? ` 最大长度：${property.maxLength} ` : '';
  //     if (descriptionComment || minComment || maxComment) {
  //       const comment = `  /**${descriptionComment}${minComment}${maxComment}*/`;
  //       propStr = `${comment}\n${propStr}`;
  //     }

  //     // 拼接属性
  //     codeStr += propStr;
  //   }

  //   codeStr += '}\n';

  //   // 是否有泛型
  //   if (genericTypes.length > 0) {
  //     codeStr = codeStr.replace(`interface ${objName}`, `interface ${objName}<${genericTypes.join(', ')}>`);
  //   }

  //   const fileName = `${objName}.ts`;

  //   console.log('===== [model]', fileName);

  //   await receiveHandler({
  //     sourceCode: codeStr,
  //     typeName: objName,
  //     fileName,
  //   });
  // }
}

export function createUnoAPI(config: UnoAPIConfig) {
  return new UnoAPI(config);
}
