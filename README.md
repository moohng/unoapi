# UnoAPI

<p align="center">
  <img src="./packages/vscode-extension/icon.png" width="128" height="128" alt="UnoAPI Icon">
</p>

<p align="center">
  <strong>前端 API 自动化代码生成解决方案</strong>
</p>

<p align="center">
  <a href="https://github.com/moohng/unoapi/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/@unoapi/core">
    <img src="https://img.shields.io/npm/v/@unoapi/core?label=@unoapi/core" alt="@unoapi/core">
  </a>
  <a href="https://www.npmjs.com/package/@unoapi/cli">
    <img src="https://img.shields.io/npm/v/@unoapi/cli?label=@unoapi/cli" alt="@unoapi/cli">
  </a>
</p>

---

UnoAPI 是一个基于 OpenAPI (Swagger) 规范的现代化前端代码生成工具集。它旨在通过自动化流程，消除繁琐的手动 API 定义工作，提供类型安全、高度可定制的开发体验。

## 🌟 核心特性

- **🚀 自动化**: 一键从 OpenAPI 文档生成 TypeScript 接口和 API 请求函数。
- **🛡️ 类型安全**: 自动生成完整的 TypeScript 类型定义，减少运行时错误。
- **🧩 模块化设计**: 采用 Monorepo 架构，提供 Core SDK、CLI 工具和 VS Code 扩展。
- **🎨 高度定制**: 支持自定义模板、类型映射和生成规则，适应不同的项目需求。
- **🔌 多平台支持**: 无论你喜欢命令行还是 IDE 插件，都能找到适合你的工具。

## 📦 生态系统

UnoAPI 由以下几个核心包组成：

| 包名 | 描述 | 链接 |
| :--- | :--- | :--- |
| **@unoapi/vscode** | **VS Code 扩展** - 提供可视化界面、右键菜单和状态栏集成，是大多数开发者的首选。 | [查看文档](./packages/vscode-extension/README.md) |
| **@unoapi/cli** | **命令行工具** - 适合 CI/CD 流程或偏好命令行的开发者。支持初始化、下载文档和生成代码。 | [查看文档](./packages/cli/README.md) |
| **@unoapi/core** | **核心库** - 包含所有核心逻辑和解析引擎。如果你想基于 UnoAPI 开发自己的工具，可以使用它。 | [查看文档](./packages/core/README.md) |

## 🚀 快速开始

### 使用 VS Code 扩展 (推荐)

1. 在 VS Code 扩展市场搜索 **"UnoAPI"** 并安装。
2. 在项目中运行命令 `UnoAPI: [init] 生成配置文件`。
3. 打开 `.ts` 文件，右键选择 `UnoAPI: [code] 生成 API 代码`。

### 使用命令行工具

```bash
# 全局安装
npm install -g @unoapi/cli

# 初始化项目
unoapi init

# 生成代码
unoapi api
```

## 🛠️ 开发与贡献

本项目使用 [pnpm](https://pnpm.io/) 管理依赖和 Monorepo。

```bash
# 克隆仓库
git clone https://github.com/moohng/unoapi.git

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行 VS Code 扩展调试
# 打开 packages/vscode-extension 目录，按 F5 启动调试
```

## 📄 许可证

本项目采用 [MIT](./packages/vscode-extension/LICENSE) 许可证。
