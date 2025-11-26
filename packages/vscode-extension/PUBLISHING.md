# VS Code Extension Changeset Publishing

## 概述

本项目使用 Changesets 管理 VS Code 扩展的版本和发布流程。

## 工作流程

### 1. 开发功能并创建 Changeset

```bash
# 开发完成后,创建 changeset
pnpm changeset

# 选择包: @unoapi/vscode
# 选择版本类型: patch/minor/major
# 描述变更内容
```

### 2. 提交 Changeset

```bash
git add .changeset
git commit -m "chore: add changeset for new feature"
git push
```

### 3. 自动发布流程

推送到 `main`/`master` 分支后:

1. **有未发布的 changesets**:
   - GitHub Actions 创建 "Version Packages" PR
   - PR 包含版本号更新和 CHANGELOG

2. **合并 PR 后**:
   - 自动构建扩展
   - 发布到 VS Code Marketplace
   - 创建 GitHub Release (tag: `vscode-vX.X.X`)
   - 上传 VSIX 文件到 Release

## 配置说明

### GitHub Secrets

需要配置: `VSCE_PAT` (Visual Studio Marketplace Personal Access Token)

### Scripts

- `pnpm changeset` - 创建 changeset
- `pnpm release:vscode` - 发布扩展 (CI 使用)
- `pnpm package` - 本地打包 VSIX
- `pnpm publish:marketplace` - 发布到 Marketplace

## 本地测试

```bash
# 构建
pnpm build:vscode

# 打包
cd packages/vscode-extension
pnpm package

# 手动发布
export VSCE_PAT=your_token
pnpm publish:marketplace
```

## 注意事项

- ✅ 每次功能完成后创建 changeset
- ❌ 不要手动修改版本号
- ✅ Changeset 自动管理版本和 CHANGELOG
- ✅ 发布后自动创建 GitHub Release
