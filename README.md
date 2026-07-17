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

建议使用 Pages v3 构建镜像，并把环境变量 `BUN_VERSION` 设置为 `1.3.14`。`public/_headers` 会为构建资源、缩略图、原图和 `gallery.json` 分别设置缓存策略。

## 图片结构

分类目录使用小写 ASCII slug，文件使用分类前缀和五位稳定编号：

```text
public/images/<category>/<category>_00001.<ext>
public/thumbs/<category>/<category>_00001.webp
```

分类的显示名、顺序、介绍和强调色在 `categories.json` 中维护。未配置的新目录也会被发现，但目录名必须符合 slug 规则。

## 添加图片

把原始图片放进 `public/images/<category>/`，然后运行：

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
public/images/        原图
public/thumbs/        WebP 缩略图
public/gallery.json   构建后的图库清单
scripts/              图片和清单维护工具
categories.json       分类配置
```

所有使用的第三方开源项目及许可证记录在 `used_open_source.txt`。
