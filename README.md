# 从 Joint 到 End Pose

面向数采训练场平台开发团队的 30 分钟入门分享，介绍机器人位姿、坐标系、URDF、TF 与 FK。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建结果位于 `dist/`。`npm run build:pages` 会使用 GitHub Pages 子路径构建。

## 导出 PDF

Slidev 导出依赖本机可用的 Chromium：

```bash
npx playwright install chromium
npm run export
```

## 内容维护

- `slides.md`：公司内部业务文档型演示，按“业务问题—数据契约—坐标与末端语义—URDF—FK—验证交付”组织。
- `style.css`：全局视觉样式。
- `CONTENT.md`：逐页内容底稿与讲解说明。
- `assets/source/`：A2D URDF 与已有 Foxglove 截图。
- 待补动画或截图在 `slides.md` 中以虚线框标记，替换对应占位即可。

## GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`。首次使用时，需要在仓库的 `Settings → Pages → Build and deployment` 中将 Source 设为 `GitHub Actions`。
