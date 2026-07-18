# 表情包分享

面向 Cloudflare Pages 的现代分类表情包图库，使用 React、TypeScript、Vite、Tailwind CSS、Lucide 和 masonry 布局。桌面端使用侧栏，移动端使用顶部分类标签；任何时候只展示一个角色分类。

## 开发

```bash
bun install
bun run sync-gallery
bun run dev
```

开发服务器默认运行在 `http://127.0.0.1:5173`。

生产构建与本地预览：

```bash
bun run build
bun run preview
```

## Cloudflare Pages

在 Pages 项目中使用以下配置：

```text
Framework preset: Vite
Build command: bun run build
Build output directory: dist
Root directory: /
```

建议使用 Pages v3 构建镜像，并设置以下环境变量：

```text
BUN_VERSION=1.3.14
VITE_ASSET_BASE_URL=https://pub-94ae1456da3d4179a4b9f3543f91240d.r2.dev
```

`VITE_ASSET_BASE_URL` 也已写入 `.env.production`，Cloudflare Pages 生产构建会自动使用。当前使用 R2 公开开发域名；以后如果绑定自定义域名，只需替换这个值。`public/_headers` 为构建资源和 `gallery.json` 设置缓存及安全响应头。

## Cloudflare R2

原图和缩略图保存在 R2 的 `images/` 和 `thumbs/` 前缀下。本地 `media/` 不进入 Git，使用配置好的 rclone remote 同步：

```bash
rclone copy media/images r2:amm-meme-share/images --progress
rclone copy media/thumbs r2:amm-meme-share/thumbs --progress
rclone check media/images r2:amm-meme-share/images
rclone check media/thumbs r2:amm-meme-share/thumbs
```

R2 存储桶需要允许网站域名发起跨域 `GET` 和 `HEAD` 请求，以支持复制和下载功能。API 凭据只保存在本机 rclone 配置中，不得放入代码库。

## 表情包生成器

站内生成器通过侧栏或 `#generator` 访问，支持文字排版、图片拖放与定位、预览缩放并导出 PNG。模板底图位于 `public/studio/templates/`，模板名称和气泡区域集中配置在 `src/features/meme-generator/templates.ts`，Canvas 绘制逻辑位于同目录的 `render.ts`。

## 图片结构

分类目录使用小写 ASCII slug，文件使用分类前缀和五位稳定编号：

```text
media/images/<category>/<category>_00001.<ext>
media/thumbs/<category>/<category>_00001.webp
```

分类的显示名、顺序、介绍和强调色在 `categories.json` 中维护。未配置的新目录也会被发现，但目录名必须符合 slug 规则。

## 添加图片

把原始图片放进 `media/images/<category>/`，然后运行：

```bash
bun run sync-gallery
```

该命令会：

1. 只为新图片追加编号，不改变已有链接。
2. 只生成新增或发生变化的 WebP 缩略图。
3. 读取真实图片宽高并重建 `public/gallery.json`。
4. 校验分类、原图、缩略图、尺寸和清单。

常用单独命令：

```bash
bun run rename-images
bun run generate-thumbs --category=phoebe
bun run generate-thumbs --animated-only --force
bun run generate-gallery
bun run validate
```

静态图片生成静态 WebP；GIF 生成保留动画与循环的动态 WebP。修改尺寸、质量或编码方式后使用 `--force` 覆盖现有缩略图。

## 项目结构

```text
src/                  React 产品界面
media/images/         本地原图（不进入 Git）
media/thumbs/         本地 WebP 缩略图（不进入 Git）
public/gallery.json   构建后的图库清单
scripts/              图片和清单维护工具
categories.json       分类配置
```

所有使用的第三方开源项目及许可证记录在 `used_open_source.txt`。
