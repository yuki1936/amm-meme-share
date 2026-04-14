# ammmemeshare

阿喵喵表情包分享站点 — 前端静态项目。

快速说明

- 主页文件: `index.html`
- 脚本: `script.js`
- 样式: `style.css`
- 缩略图生成脚本: `scripts/generate-thumbs.js`（需 Node + sharp）
- 缩略图目录（建议不放入仓库）: `thumbs/`
- 图片资源目录（通常较大，建议使用外部存储或 Git LFS）: `images/`

上传到 GitHub 的建议（安全与大小考虑）

1. 建议不要将 `images/` 或 `thumbs/`（如果很大）直接推到 Git 仓库。可使用 Git LFS、Release、或把图片放到 CDN/对象存储并在 `images.json` 指向正确 URL。

2. 在本仓库中保留源码与生成脚本：`index.html`, `script.js`, `style.css`, `scripts/`, `sw.js` 等。

生成缩略图

```bash
npm install
npm run generate-thumbs
```

把项目推到 GitHub（推荐方法 — 使用 GitHub CLI）

```bash
# 若你尚未登录 gh：
gh auth login

# 在当前目录创建远程仓库并推送（public 或 --private）
gh repo create ammmemeshare --public --source=. --remote=origin --push
```

如果你不使用 `gh`，手动操作：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
# 在 GitHub 新建仓库并复制 remote URL，然后：
git remote add origin git@github.com:YOUR_USERNAME/ammmemeshare.git
git push -u origin main
```

注意：如果你要把大量二进制图片放到仓库，请考虑使用 Git LFS 或把图片放在外部对象存储。

自动化发布脚本

- `scripts/publish.sh`：尝试用 `gh` 创建仓库并 push；若无 gh，会提示手动命令。
- `scripts/publish.ps1`：PowerShell 等价脚本。

需要我为你执行发布脚本（需要在你的环境中运行并在过程中进行授权），还是你希望我先做其他修改？
