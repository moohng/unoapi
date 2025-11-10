# @unoapi/core

[![build](https://github.com/moohng/unoapi/actions/workflows/release.yaml/badge.svg)](https://github.com/moohng/unoapi/actions/workflows/release.yaml)
[![NPM Version](https://img.shields.io/npm/v/@unoapi/core.svg?style=flat)](https://www.npmjs.org/package/@unoapi/core)
[![NPM Downloads](https://img.shields.io/npm/dm/@unoapi/core.svg?style=flat)](https://npmcharts.com/compare/@unoapi/core?minimal=true)
[![install size](https://packagephobia.com/badge?p=@unoapi/core)](https://packagephobia.com/result?p=@unoapi/core)

@unoapi/core 是 UnoAPI 体系的核心库，专为现代前后端分离项目提供高效、类型安全的 API 自动化编码能力。它聚焦于 OpenAPI 规范解析、类型推导、代码生成、接口文档处理等底层能力，为 CLI、VSCode 插件、脚手架等上层工具提供统一的 API 生成与管理基础。

## 核心特性

- **OpenAPI 解析**：支持 OpenAPI 3.x 规范，自动解析接口定义，提取类型、路径、参数、响应等信息。
- **类型推导与生成**：自动生成 TypeScript 类型定义，保障前端/后端类型一致性。
- **代码生成引擎**：可扩展的模板系统，支持自定义 API 客户端、类型、注释等多种输出。
- **零侵入集成**：可作为独立库集成到任意 Node.js/TypeScript 项目，也可作为 CLI/插件的依赖。
- **灵活配置**：支持多种配置方式，兼容多项目结构和团队协作需求。

## 主要能力

- OpenAPI JSON 文档解析
- TypeScript 类型与接口自动生成
- API 客户端代码生成（可自定义模板）
- 配置文件（unoapi.config.ts/js）自动生成与加载
- 支持多输出目录、缓存、类型映射等高级特性

## 安装

推荐通过 npm 或 pnpm 安装：

```bash
pnpm add @unoapi/core
# 或
npm install @unoapi/core
```

## 核心用法

```ts
// 加载配置
const config = await loadConfig();

// 下载文档
const doc = await downloadDoc(config.openapiUrl, config.cacheFile);

// 搜索api接口
const apis = searchApi(doc, term);

// 生成 api 代码
const genApis = generateCode(apis, {
  funcTpl: config.funcTpl,
  typeMapping: config.typeMapping,
});

// 写入 api 文件
await writeApiFile(genApi, { base: baseApiOutput, imports: config.imports });

// 获取类型定义代码
const genModels = genApi.getModels(doc.components.schemas);

// 写入类型定义文件
await writeModelFile(genModels, {
  base: baseModelOutput,
  asGlobalModel: options.globalModel ?? config.asGlobalModel,
});
```

## 适用场景

- 前端 API 类型自动生成
- 定制化 API 客户端生成
- 作为 CLI、脚手架、IDE 插件的底层依赖

---

@unoapi/core —— 让 API 类型与代码生成更高效、更可靠、更自动化。
