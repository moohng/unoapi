# @unoapi/core

[![NPM Version](https://img.shields.io/npm/v/@unoapi/core.svg?style=flat)](https://www.npmjs.org/package/@unoapi/core)
[![License](https://img.shields.io/npm/l/@unoapi/core.svg?style=flat)](https://github.com/moohng/unoapi/blob/main/LICENSE)

**@unoapi/core** 是 UnoAPI 生态系统的核心引擎。它负责 OpenAPI 文档的解析、类型推导和代码生成逻辑。

如果你正在构建自己的 API 工具、脚手架或 IDE 插件，这个库将为你提供强大的底层支持。

## ✨ 核心特性

- **OpenAPI 3.1 支持**: 完整的 OpenAPI 规范解析能力。
- **TypeScript 类型生成**: 自动从 Schema 生成精确的 TypeScript 接口。
- **高度可配置**: 支持自定义模板、类型映射和输出规则。
- **函数式 API**: 提供函数式 API 风格，可以方便地集成到其他工具中。

## 📦 安装

```bash
pnpm add @unoapi/core
# 或
npm install @unoapi/core
```

## 💻 编程式使用

提供函数式 API 风格，可以方便地集成到其他工具中。

```typescript
import { loadConfig, loadDoc, searchApi, generateCode, autoWriteAll } from '@unoapi/core';

async function main() {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 加载文档
  const doc = await loadDoc(config.input);

  // 3. 搜索接口 (例如搜索 'user')
  const apis = searchApi(doc, 'user');

  // 4. 生成代码
  const genApis = generateCode(apis, {
    funcTpl: config.funcTpl,
    typeMapping: config.typeMapping,
    ignores: config.ignores,
  });

  // 5. 写入文件
  await autoWriteAll(genApis, {
    apiOutput: config.output,
    modelOutput: config.modelOutput,
    onlyModel: config.onlyModel,
    schemas: doc.components?.schemas,
    imports: config.imports,
  });
}

main();
```

更多 API 可以参考 [TypeScript API](https://github.com/moohng/unoapi/blob/main/packages/core/src/index.ts)。

## ⚙️ 配置参考

`UnoConfig` 接口定义了所有可用的配置选项：

| 选项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `input` | `string \| () => object` | - | OpenAPI 文档的 URL 地址 |
| `output` | `string \| [string, string]` | `'src/api'` | 输出目录。如果是数组，第二个元素为 Model 输出目录 |
| `typeMapping` | `Record<string, string>` | - | 自定义类型映射 (例如 `{ 'integer': 'number' }`) |
| `funcTpl` | `(context) => string` | - | 自定义 API 函数生成模板 |
| `imports` | `string \| string[]` | - | API 文件头部的导入语句 |
| `onlyModel` | `boolean` | `false` | 是否只生成 Model 类型 |

更多配置选项请参考 [UnoUserConfig](https://github.com/moohng/unoapi/blob/main/packages/core/src/config.ts)。

## 🔗 相关链接

- [UnoAPI CLI](../cli/README.md)
- [VS Code Extension](../vscode-extension/README.md)
