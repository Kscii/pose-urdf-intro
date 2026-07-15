# 从 Joint 到 End Pose

面向数采训练场平台开发团队的 40–45 分钟入门分享，围绕“URDF 静态结构 + 当前关节值 → FK → End Pose”介绍机器人位姿、坐标系、URDF、TF 与 FK。

## 本地运行

```bash
npm install
npm run dev
```

## 双屏演示（观众看 PPT，演讲者看 PPT + 注释）

Slidev 自带演讲者模式，本项目不需要额外安装插件。先在操作系统的显示设置中将两块屏幕设为“扩展”，不要选择“复制/镜像”，然后运行：

```bash
npm run dev
```

终端会显示本地地址（通常是 `http://localhost:3030`）。用两个浏览器窗口分别打开：

- **观众屏幕**：`http://localhost:3030/1`，拖到投影仪或第二块屏幕，按 `F` 进入全屏。
- **当前屏幕**：`http://localhost:3030/presenter/1`，显示当前页、下一页、计时器和演讲者注释。

在演讲者窗口中用方向键、空格键或 Page Up / Page Down 翻页，观众窗口会同步切换。如果没有同步，打开页面左下角工具栏中的同步设置，确认演讲者窗口允许发送、观众窗口允许接收。

`slides.md` 中每页末尾的 HTML 注释会被 Slidev 当作该页的演讲者注释，例如：

```md
# 页面标题

观众可以看到的内容

<!--
这里是仅在演讲者模式中显示的讲解提示。
-->
```

注意：只有一页内容末尾的最后一个 HTML 注释块会作为该页注释。当前 `slides.md` 已经包含部分讲解注释，其余页面可以按上述格式继续补充。

演示时建议先打开观众窗口并移到第二块屏幕，再让该窗口全屏；演讲者窗口留在当前屏幕。浏览器全屏只作用于当前窗口，不会遮住另一块屏幕上的演讲者视图。

## 构建

```bash
npm run build
```

构建结果位于 `dist/`。`npm run build:pages` 会使用 GitHub Pages 子路径构建。

提交前可以构建演示稿，并用 Chromium 检查全部页面是否有内容超出 Slidev 画布：

```bash
npm run check:overflow
```

检查失败时会输出对应页码、标题、越界方向和溢出量。首次运行前如果本机尚未安装 Playwright 的 Chromium，请执行 `npx playwright install chromium`。

## 导出 PDF

Slidev 导出依赖项目中的 `playwright-chromium` 和本机可用的 Chromium。首次使用时执行：

```bash
npm install
npx playwright install chromium
npm run export
```

## 内容维护

- `slides.md`：正式演示，按 URDF、FK、End 三个模块组织，并由同一条 A2D 左臂数据链贯穿。
- `style.css`：全局视觉样式。
- `CONTENT.md`：逐页内容底稿与讲解说明。
- `assets/source/`：A2D URDF 与已有 Foxglove 截图。
- 待补动画或截图统一记录在 Markdown 注释或 `CONTENT.md` 中，不在正式演示页显示占位框。

## GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`。首次使用时，需要在仓库的 `Settings → Pages → Build and deployment` 中将 Source 设为 `GitHub Actions`。
