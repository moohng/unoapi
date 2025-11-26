# UnoAPI 自动化编码助手

[![Version](https://img.shields.io/visual-studio-marketplace/v/qianduanxh.unoapi-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/qianduanxh.unoapi-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension)

基于 OpenAPI 规范自动生成前端 API 代码的 VS Code 扩展。

## ✨ 功能特性

- 🚀 **一键生成** - 从 OpenAPI 文档自动生成 TypeScript API 代码
- 🔍 **智能搜索** - 支持关键字搜索接口,快速定位需要的 API
- 📝 **类型安全** - 自动生成 TypeScript 类型定义
- 🎯 **灵活配置** - 支持自定义函数模板、类型映射等
- 📊 **状态栏显示** - 实时显示配置状态,一键初始化
- 🎨 **多种生成方式** - 支持生成全部接口、单个接口或仅 Model

## 📦 安装

在 VS Code 扩展市场搜索 `UnoAPI` 或 [点击安装](https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension)

## 🚀 快速开始

### 1. 初始化配置

点击状态栏的 `⚠ UnoAPI` 或运行命令 `UnoAPI: [init] 生成配置文件`

![初始化配置](https://via.placeholder.com/600x300?text=Init+Config)

### 2. 生成 API 代码

- **命令面板**: `Ctrl/Cmd + Shift + P` → `UnoAPI: [code] 生成 API 代码`
- **右键菜单**: 在文件或文件夹上右键 → `UnoAPI: [code] 生成 API 代码`
- **状态栏**: 点击 `✓ UnoAPI`

![生成代码](https://via.placeholder.com/600x300?text=Generate+Code)

### 3. 选择接口

- 输入关键字搜索接口
- 支持多选
- 选择 "生成所有接口" 可一次性生成全部

![选择接口](https://via.placeholder.com/600x300?text=Select+APIs)

## 📝 配置说明

支持三种配置方式:

### package.json

```json
{
  "unoapi": {
    "openapiUrl": "https://api.example.com/openapi.json",
    "output": "src/api"
  }
}
```

### unoapi.config.js

```javascript
export default {
  openapiUrl: 'https://api.example.com/openapi.json',
  output: 'src/api',
  typeMapping: {
    integer: 'number'
  }
}
```

### unoapi.config.ts

```typescript
import { defineUnoConfig } from '@unoapi/core';

export default defineUnoConfig({
  openapiUrl: 'https://api.example.com/openapi.json',
  output: ['src/api', 'src/models'],
  funcTpl: (context) => {
    return `export function ${context.name}() { /* custom */ }`;
  }
});
```

## 🎯 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `openapiUrl` | `string` | - | OpenAPI 文档地址 |
| `output` | `string \| [string, string]` | `src/api` | 输出目录,数组表示 [API目录, Model目录] |
| `cacheFile` | `string` | `.openapi-cache.json` | 缓存文件路径 |
| `typeMapping` | `Record<string, string>` | - | 自定义类型映射 |
| `funcTpl` | `Function` | - | 自定义函数模板 |
| `asGlobalModel` | `boolean` | `false` | 是否生成全局类型 |
| `imports` | `string \| string[]` | - | API 文件头部导入代码 |

## 🎨 使用场景

### 场景 1: 生成单个接口

1. 打开目标文件
2. 右键 → `UnoAPI: [code] 生成 API 代码`
3. 选择接口
4. 输入自定义函数名(可选)
5. 代码自动追加到当前文件

### 场景 2: 生成到指定目录

1. 在资源管理器中右键文件夹
2. 选择 `UnoAPI: [code] 生成 API 代码`
3. 选择接口
4. 代码生成到选中的目录

### 场景 3: 仅生成 Model

1. 运行命令 `UnoAPI: [model] 生成 Model 代码`
2. 选择接口
3. 只生成 TypeScript 类型定义

## 🔧 命令列表

| 命令 | 说明 |
|------|------|
| `UnoAPI: [init] 生成配置文件` | 初始化配置文件 |
| `UnoAPI: [download] 下载 OpenAPI 文档` | 下载并缓存 OpenAPI 文档 |
| `UnoAPI: [code] 生成 API 代码` | 生成 API 函数和类型 |
| `UnoAPI: [model] 生成 Model 代码` | 仅生成类型定义 |

## 📊 状态栏

- `✓ UnoAPI` - 已配置,点击生成代码
- `⚠ UnoAPI` - 未配置,点击初始化
- `⏳ UnoAPI` - 正在加载文档

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

- GitHub: [moohng/unoapi](https://github.com/moohng/unoapi)
- 问题反馈: [Issues](https://github.com/moohng/unoapi/issues)

## 📄 许可证

MIT

## 🔗 相关链接

- [UnoAPI CLI](../cli/README.md) - 命令行工具
- [UnoAPI Core](../core/README.md) - 核心库
- [OpenAPI 规范](https://swagger.io/specification/)

---

Made with ❤️ by [前端星河](https://github.com/moohng)
