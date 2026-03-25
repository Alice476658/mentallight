# 心绪微光（MentalLight）— 项目说明

单页实验性前端：默认进入 **「灵感花园」主页**（纯黑背景中央 **「光之书」** WebGL：书脊、扇形发光页片、星尘与外向发散粒子；体量随倾诉/日记/星星养分略增），点击 **「进入倾诉」** 后进入 **Three.js 情绪粒子场** + **右侧「倾诉」侧栏**。无构建步骤，用浏览器直接打开 `index.html` 即可（建议通过本地静态服务器打开，避免部分环境对 `file://` 的限制）。

**代码拆分**：样式在 `css/app.css`；脚本在 **`js/mental-light/`** 目录下（无打包）：`config.js`（配置键）、`mood-detect.js`、`garden-diary.js`、`book-of-light.js`（首页光之书）、`scene-tree.js`（Three.js、情绪粒子、场景与视图切换）、`pour-conv.js`（倾诉与对话卡片）。`index.html` 按顺序同步加载。**`启动本地预览.bat`**：双击后在浏览器打开 `http://localhost:8080`（需已安装 Python）。**`js/app.js`** + **`python tools/split-app.py`** 可用于从单文件重新生成 `mental-light/*.js`（生成后请核对与手调的差异，尤其是 `pour-conv` 与粒子数量等）。

---

## 入口与文件角色

| 文件 | 说明 |
|------|------|
| `index.html` | **页面壳**：字体、**cdnjs** `three.min.js`（r128）、**unpkg** `OrbitControls.js`、`css/app.css`、正文 DOM、末尾按序加载 `js/mental-light/*.js`。 |
| `css/app.css` | 全站样式（含 `#ml-boot-error`）。 |
| `js/mental-light/*.js` | 功能模块；`window.MentalLightCoreApi` 为场景与视图切换入口。 |
| `启动本地预览.bat` | 在项目根目录启动 `http://localhost:8080`（Python）。 |
| `js/app.js` | **备份用单文件脚本**（与当前 `index.html` 无关联，供拆分脚本源或对照）。 |
| `tools/split-app.py` | 从 `js/app.js` 生成 `js/mental-light/*.js` 的辅助脚本。 |
| `assets/*` | 各心情可选的全屏摄影/插画底图（`MOOD_BACKGROUND_IMAGES` 配置）。 |
| `App.js` | 早期演示脚本：简单关键词 + `window.myApp.updateMood`，**未被 `index.html` 引用**。 |
| `style.css` | 早期演示样式，**未被 `index.html` 引用**。 |
| `EmotionService.js` | 当前为空占位，**未被引用**。 |

---

## 功能概览

### 1. 灵感花园主页（光之书）

- 默认 **`app-view-home`**：**纯黑背景** + 中央 **光之书**（扇形书页、加性混合材质粒子与外向漂移星尘），与倾诉页心情 **粒子场** 分时显示。
- **养分与进度**：顶栏文案展示 **光之书** 近似进度（0%→100%）、倾诉条数、日记篇数；`scene-tree` 内 `getLifeTreeGrowthScore()` 将倾诉、日记篇数与累计星星合成养分，驱动 **`bookApi.setGrowthMul`** 微调书的体量与粒子尺寸。
- **进入倾诉** / **返回灵感花园**：在主页与侧栏间切换视图；进入倾诉时隐藏光之书，显示当前心情粒子场。
- **世界名著语录**：页面 **左上方** 展示与 **当前心情** 匹配的世界文学摘录（**中、英全文** + 作品名与作者）；**整页刷新** 会重新随机；可 **换一句 / 摘录复制 / 点赞收藏**（`mentallight_quote_likes_v1`）。首页折叠区 **「名著语录收藏」** 可 **搜索** 已点赞条目并再次摘录或移除。
- **花园日记**：主页「写日记」与倾诉内「写心情日记」共用同一套编辑器；**每满 100 字本篇 1 颗 ★**；保存后生成卡片（支持图片、复制/删除）。倾诉入口会按 **当前检测心情** 套用 **不同日记本外观**（`#diary-modal.diary-skin-*`），条目可带 `journalMood` / `journalSource`（`garden` | `pour`）。存储键不变：`mentallight_garden_diary_v1`、`mentallight_stars_total_v1`。

### 2. 三维情绪粒子场

- 使用 **Three.js r128**（cdnjs）与 **OrbitControls**（jsdelivr，与 r128 示例路径匹配）。
- 约 **4200** 个粒子，`Points` + 自定义 `BufferGeometry`，每帧更新位置与顶点颜色。
- **OrbitControls**：阻尼旋转、缩放距离限制、自动缓慢旋转。
- **心情 → 视觉模式**：`visualMode()` 将部分心情映射到基础运动模板（如 `anxious`/`hopeful`/`warm` → `calm` 系，`tired` → `sad` 系），再在颜色与参数上区分。
- **点击画布**：射线近似命中空间区域，对当前心情下的粒子做扰动/闪光（如愉悦环、嫉妒拖拽等，依 `currentMood` 分支）。

### 3. 全屏氛围与主题（倾诉模式）

- `body` 的 `mood-*` class 切换：**多层 CSS 渐变背景**、部分心情的 `::before` / `::after` 动画层（如愤怒闪烁、焦虑频闪几何等）。
- `#mood-bg`：可选 **背景图** 与渐变叠化；无图时仅渐变。
- `#chat-container` 与右侧 **`#pour-tab`** 共用同一套 **CSS 变量**（面板底色、描边、强调色、光晕等），随心情同步。

### 4. 倾诉侧栏（浮层）

- 屏幕右侧 **`#pour-tab`**：竖排文案，在 **「倾诉」** 与 **「收起」** 之间切换；`aria-expanded` / `aria-controls` 关联 `#pour-panel`。
- **`#pour-panel`**：自右侧滑入，最大宽度约 `420px`，带 `safe-area` 内边距；内含 **「写心情日记」**，打开与花园相同的日记浮层并套用当前心情皮肤。
- **`#pour-backdrop`**：半透明遮罩，点击关闭。
- **`Escape`**：侧栏打开时关闭；日记打开时优先关闭日记。
- 主输入区按钮文案为 **「发送」**；侧栏条承担打开/关闭「倾诉」入口。

### 5. 文本情绪分析（前端模拟）

- `mockAIAnalyze()`：在下一帧用 `requestAnimationFrame` 调用 `detectMood(text)`（无固定 700ms），等待时 `#ai-status` 显示「分析中」。
- `detectMood()`：**正则与打分表**，按优先级选取最高分心情；无匹配时默认为 `calm`。覆盖 UI 中提示的多种情绪标签（平静、难过、愤怒、嫉妒、愉悦、焦虑、疲惫、期待、恐惧/紧张、温情等）。
- **非真实大模型**：无网络 API，适合演示与离线使用。

### 6. 对话卡片（会话摘录与持久化）

- 每次发送后：`appendConvCard()` 在 **「对话卡片」** `details` 区域追加一条卡片（用户原文 + 心情标签 + 文案回复与 hint）。
- 工具栏：**全选 / 删除所选 / 清空全部**；单卡可删除；上限 **60** 条（超出时移除最旧）。
- **持久化**：列表写入 **`localStorage`** 键 **`mentallight_conv_v1`**（JSON 数组，含 `iso` / `mood` / 用户与回复文本）；刷新后 **自动恢复**；删除或清空会同步更新存储。

### 7. 旧版「倾诉记录」日记

- 早期键名 **`mentallight_journal_v1`** 已不再使用；当前仅以 **`mentallight_conv_v1`** 保存对话卡片。

---

## 技术特性摘要

- **纯静态 HTML**：无打包、无框架；字体来自 Google Fonts（需网络）。
- **WebGL**：透明画布叠在 CSS 背景之上。
- **响应式**：窗口 `resize` 时更新相机与渲染尺寸；侧栏宽度使用 `min(100vw - 48px, 420px)`。
- **无障碍**：侧栏使用 `role="dialog"`、`aria-label`；标签按钮带 `title` / `aria-*`（可按需继续加强焦点陷阱等）。

---

## 运行方式

1. 将整个文件夹作为静态站点根目录，用任意静态服务器打开（例如 VS Code Live Server、`npx serve` 等）。
2. 直接双击 `index.html` 在部分浏览器中也可运行；若底图或脚本加载失败，请改用 HTTP 服务。

---

## 扩展建议（开发向）

- 将 `detectMood` / 粒子参数抽成独立模块，便于单测与调参。
- 若接入真实 API：替换 `mockAIAnalyze`，保留 `setMood` + `statusLines` 映射即可。
- 本地数据含 **对话摘录**、日记与星星等，若在意隐私请勿在公共电脑长期使用或可在浏览器中清除站点数据。

---

*文档与当前代码同步；以仓库内 `index.html` 为准。*
