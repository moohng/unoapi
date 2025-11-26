# VS Code Extension Publishing Flow

## 核心流程概述

现在的发布流程由两个 GitHub Actions 工作流协同完成：

1. **`release.yaml`**: 负责**版本管理**和**NPM 发布** (Core/CLI)
2. **`publish-vscode.yml`**: 负责**VS Code 市场发布**和**GitHub Release**

## 详细步骤

### 1. 开发与提交

1. 开发功能或修复 Bug
2. 运行 `pnpm changeset` 添加变更说明
   - 选择 `unoapi-vscode-extension` (以及其他修改的包)
   - 选择版本类型 (patch/minor/major)
3. 提交并推送到 `main` 分支

### 2. 自动版本管理 (由 `release.yaml` 处理)

- GitHub Actions 检测到新的 changeset
- 自动创建一个 **"Version Packages"** 的 Pull Request
- 这个 PR 会包含：
  - `package.json` 版本号更新
  - `CHANGELOG.md` 更新
  - 删除 `.changeset` 目录下的临时文件

### 3. 确认发布

- 审查 "Version Packages" PR
- **合并 (Merge)** 该 PR 到 `main` 分支

### 4. 自动发布执行

合并后，两个工作流会同时触发，但各司其职：

#### A. `release.yaml`
- 发布 `@unoapi/core` 和 `@unoapi/cli` 到 NPM
- **跳过** `unoapi-vscode-extension` (因为它被标记为 `private: true`)

#### B. `publish-vscode.yml`
- 检测到提交信息包含 "Version Packages"
- 执行 `pnpm vscode:publish`：
  - 构建 Core 和 Extension
  - 打包 VSIX
  - 发布到 VS Code Marketplace
- **创建 GitHub Release**：
  - 标题: `VS Code Extension vX.X.X`
  - 内容: 包含版本号
  - 附件: 自动上传 `.vsix` 文件

## 本地调试

如果需要本地测试打包或发布：

```bash
# 仅打包 (生成 .vsix)
cd packages/vscode-extension
pnpm package

# 手动发布 (需要设置 VSCE_PAT 环境变量)
export VSCE_PAT=your_token
pnpm publish:marketplace
```

## 常见问题

**Q: 为什么 VS Code 扩展在 package.json 中是 private?**
A: 为了防止 `release.yaml` 把它发布到 NPM 仓库。VS Code 扩展应该发布到 Visual Studio Marketplace，这是由 `publish-vscode.yml` 处理的。

**Q: 如何触发发布?**
A: 只需要合并 "Version Packages" PR 即可。
