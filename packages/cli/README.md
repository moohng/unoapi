# UnoAPI CLI

UnoAPI CLI 是一个为现代前后端分离项目设计的 API 工具链命令行工具，旨在提升 API 开发、维护与协作效率。它支持基于 OpenAPI 规范的接口文档解析、代码生成等功能，助力团队实现高效、规范、自动化的 API 管理流程。

## 功能特性

- **代码生成**：一键生成 TypeScript API 请求代码、类型定义等，提升前端开发效率。
- **零配置**：不需要写繁琐配置文件，开箱即用。
- **零侵入**：对项目没有任何污染，用完即弃、不留痕迹。
- **CLI 友好**：提供直观易用的命令行界面，支持常用参数与交互能力。
- **搜索能力**：不需要知道具体的接口地址，可进行模糊搜索。

## 安装【可选】

使用 [pnpm](https://pnpm.io/) 或 [npm](https://www.npmjs.com/) 进行全局安装：

```bash
pnpm add -g @unoapi/cli
# 或
npm install -g @unoapi/cli
```

## 快速开始

- **在线模式**

   零配置、零侵入快速体验：

   ```bash
   npx @unoapi/cli -u https://api.example.com/api-json
   # 或
   uno -u https://api.example.com/api-json
   ```

- **离线模式**

   将接口文档下载到本地后，即可离线使用，提升效率：

   ```bash
   # 下载文档
   uno download https://api.example.com/api-json
   # 生成代码
   uno
   ```

- **更多配置**

   一键生成本地配置文件，可定制化更多功能：

   ```bash
   # 生成配置文件
   uno init
   # 生成代码
   uno
   ```

## 常用命令

| 命令                | 说明                         |
|---------------------|------------------------------|
| `unoapi init`       | 初始化配置文件               |
| `unoapi download`       | 同步远程 OpenAPI 文档        |
| `unoapi api`   | 生成 API 客户端代码          |

## 配置说明

工具默认读取项目根目录下的 `unoapi.config.ts` 配置文件。配置项包括：

```ts
export interface UnoUserConfig {
  /**
   * OpenAPI URL 地址，可以是字符串或返回字符串的函数
   */
  openapiUrl?: OpenApiInput;
  /**
   * 输出目录，默认 src/api；数组表示models输出目录
   */
  output?: string | [string, string];
  /**
   * 缓存文件，默认 [output]/.openapi-cache.json
   */
  cacheFile?: string;
  /**
   * 自定义类型映射
   */
  typeMapping?: Record<string, string>;
  /**
   * 自定义 api 函数
   */
  funcTpl?: FuncTplCallback;
  /**
   * 只生成 model 代码
   */
  onlyModel?: boolean;
  /**
   * 是否将 model 类型写入全局
   */
  asGlobalModel?: boolean;
  /**
   * api 函数的头部导入代码
   */
  imports?: string | string[];
}
```

---

UnoAPI CLI —— 让 API 开发更高效、更规范、更自动化。
