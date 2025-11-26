# @unoapi/core

[![NPM Version](https://img.shields.io/npm/v/@unoapi/core.svg?style=flat)](https://www.npmjs.org/package/@unoapi/core)
[![License](https://img.shields.io/npm/l/@unoapi/core.svg?style=flat)](https://github.com/moohng/unoapi/blob/main/LICENSE)

**@unoapi/core** 是 UnoAPI 生态系统的核心引擎。它负责 OpenAPI 文档的解析、类型推导和代码生成逻辑。

如果你正在构建自己的 API 工具、脚手架或 IDE 插件，这个库将为你提供强大的底层支持。

## ✨ 核心特性

- **OpenAPI 3.x 支持**: 完整的 OpenAPI 规范解析能力。
- **TypeScript 类型生成**: 自动从 Schema 生成精确的 TypeScript 接口。
- **AST 级代码生成**: 不仅仅是字符串拼接，提供更安全的代码生成。
- **高度可配置**: 支持自定义模板、类型映射和输出规则。
- **平台无关**: 可以在 Node.js、浏览器（部分功能）或任何 JS 运行时中使用。

## 📦 安装

```bash
pnpm add @unoapi/core
# 或
npm install @unoapi/core
```

## 💻 编程式使用

```typescript
import { loadConfig, downloadDoc, searchApi, generateCode, writeApiFile } from '@unoapi/core';

async function main() {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 下载并解析文档
  const doc = await downloadDoc(config.openapiUrl, config.cacheFile);

  // 3. 搜索接口 (例如搜索 'user')
  const apis = searchApi(doc, 'user');

  // 4. 生成代码
  const generatedApis = generateCode(apis, {
    funcTpl: config.funcTpl,
    typeMapping: config.typeMapping,
  });

  // 5. 写入文件
  for (const api of generatedApis) {
    await writeApiFile(api, {
      base: 'src/api',
      imports: config.imports
    });
  }
}

main();
```

## ⚙️ 配置参考

`UnoConfig` 接口定义了所有可用的配置选项：

| 选项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `openapiUrl` | `string \| () => string` | - | OpenAPI 文档的 URL 地址 |
| `output` | `string \| [string, string]` | `'src/api'` | 输出目录。如果是数组，第二个元素为 Model 输出目录 |
| `cacheFile` | `string` | `'.openapi-cache.json'` | 文档缓存文件路径 |
| `typeMapping` | `Record<string, string>` | - | 自定义类型映射 (例如 `{ 'integer': 'number' }`) |
| `funcTpl` | `(context) => string` | - | 自定义 API 函数生成模板 |
| `imports` | `string \| string[]` | - | API 文件头部的导入语句 |
| `onlyModel` | `boolean` | `false` | 是否只生成 Model 类型 |
| `asGlobalModel` | `boolean` | `false` | 是否生成全局命名空间的类型 |

## 🔗 相关链接

- [UnoAPI CLI](../cli/README.md)
- [VS Code Extension](../vscode-extension/README.md)
