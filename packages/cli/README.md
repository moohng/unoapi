# @unoapi/cli

[![NPM Version](https://img.shields.io/npm/v/@unoapi/cli.svg?style=flat)](https://www.npmjs.org/package/@unoapi/cli)
[![License](https://img.shields.io/npm/l/@unoapi/cli.svg?style=flat)](https://github.com/moohng/unoapi/blob/main/LICENSE)

**@unoapi/cli** 是 UnoAPI 的命令行界面工具。它专为喜欢终端操作或需要集成到 CI/CD 流程的开发者设计。

## ✨ 功能特性

- **🚀 快速初始化**: 一键生成项目配置文件。
- **📥 文档同步**: 快速下载并缓存 OpenAPI 文档。
- **⚡ 代码生成**: 基于配置自动生成 API 接口和类型定义。
- **🔍 交互式体验**: 提供友好的命令行交互提示。

## 📦 安装

推荐全局安装以便在任何地方使用：

```bash
npm install -g @unoapi/cli
# 或
pnpm add -g @unoapi/cli
```

也可以使用 `npx` 临时运行：

```bash
npx @unoapi/cli --help
```

## 🚀 快速开始

### 1. 初始化项目

在项目根目录下运行：

```bash
unoapi init
```

这将引导你创建一个 `unoapi.config.ts` 配置文件。

### 2. 下载文档

```bash
unoapi download
```

这将根据配置的 URL 下载 OpenAPI 文档并缓存到本地。

### 3. 生成代码

```bash
unoapi api
```

这将根据配置生成 API 接口和类型定义文件。

## 📖 命令参考

| 命令 | 别名 | 说明 |
| :--- | :--- | :--- |
| `unoapi init` | - | 初始化配置文件 |
| `unoapi download` | `dl` | 下载 OpenAPI 文档 |
| `unoapi api` | `gen` | 生成 API 代码 |
| `unoapi help` | - | 查看帮助信息 |

## ⚙️ 配置文件

CLI 会自动读取项目根目录下的 `unoapi.config.ts` 或 `unoapi.config.js`。

```typescript
import { defineUnoConfig } from '@unoapi/core';

export default defineUnoConfig({
  openapiUrl: 'https://api.example.com/v3/api-docs',
  output: 'src/api',
  // ...其他配置
});
```

更多配置选项请参考 [@unoapi/core 文档](../core/README.md#配置参考)。

## 🔗 相关链接

- [UnoAPI Core](../core/README.md)
- [VS Code Extension](../vscode-extension/README.md)
