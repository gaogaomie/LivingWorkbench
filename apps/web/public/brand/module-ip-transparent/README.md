# 日常集模块 IP 候选

本组素材为模块级动物／植物角色，延续日常集现有透明主体 IP 的圆润森林邻居风格。每个模块包含左右构图各一张，所有图片均为独立生成的原始结果，未自动筛选、重绘或后期处理。

## 模块映射

| 编号 | 模块 | IP 形象 | 设计联系 | 构图 | 主体配色 | 文件 |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | 时光档案 | 年轮树精 | 年轮对应时间沉淀与生活记录积累 | 左下 | 暖橡木棕、柔和鼠尾草绿 | `H1-timeline-tree-ring-left.png` |
| H2 | 时光档案 | 年轮树精 | 年轮对应时间沉淀与生活记录积累 | 右下 | 深胡桃棕、暖蜂蜜黄 | `H2-timeline-tree-ring-right.png` |
| I1 | 回收站 | 浣熊回收员 | 整理、拾回与再次利用对应记录恢复 | 左下 | 烟灰褐、深炭灰 | `I1-recycle-raccoon-left.png` |
| I2 | 回收站 | 浣熊回收员 | 整理、拾回与再次利用对应记录恢复 | 右下 | 低饱和蓝灰、暖奶油色 | `I2-recycle-raccoon-right.png` |
| J1 | 今日总览 | 猫头鹰向导 | 全局观察对应一天的信息汇总 | 左下 | 深午夜蓝绿、暖奶油色 | `J1-overview-owl-left.png` |
| J2 | 今日总览 | 猫头鹰向导 | 全局观察对应一天的信息汇总 | 右下 | 暮色梅紫、浅桃色 | `J2-overview-owl-right.png` |
| K1 | 习惯健康 | 竹笋宝宝 | 每日生长一点对应温和、连续的习惯 | 左下 | 鲜竹绿、浅暖黄 | `K1-habits-bamboo-left.png` |
| K2 | 习惯健康 | 竹笋宝宝 | 每日生长一点对应温和、连续的习惯 | 右下 | 深玉绿、柔和奶油色 | `K2-habits-bamboo-right.png` |
| L1 | 日程统筹 | 蜜蜂管家 | 有序节奏对应安排、提醒与执行 | 左下 | 暖蜂蜜黄、深可可棕 | `L1-schedule-bee-left.png` |
| L2 | 日程统筹 | 蜜蜂管家 | 有序节奏对应安排、提醒与执行 | 右下 | 暖琥珀橙、深森林蓝绿 | `L2-schedule-bee-right.png` |

## 生成记录

- 生成方式：Codex 内置 OpenAI 图像生成工具。
- 模型信息：运行时工具结构未公开具体模型名称，因此不推测型号。
- 约束传递方式：主提示词内自然语言约束；工具没有独立负面提示词参数。
- 画布：透明 `1:1` PNG，保留服务原生尺寸。
- 色彩：每张角色使用两种主体语义色，不含背景色。

## 完整提示词模板

将表格中的模块含义、主体、两种配色与角落参数代入以下模板，即为每张图片使用的完整提示词。

```text
Create one complete 1:1 square image with a genuinely transparent background.
Concept: embody <模块含义> through one friendly forest animal or plant character, without using symbols, objects, text, or scenery.
Subject: place one extremely simplified, cute, endearing <角色主体>, reduced to one soft rounded continuous silhouette and one defining feature. Show the character subject only.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly two semantic colors in the complete character: exactly <主体色 1> and <主体色 2>. Organize both colors into broad purposeful masses and reuse only these colors for facial marks. Keep facial marks clearly separated.
Composition: keep the character upright and emerging from the <角落>, filling about 85–95% of the square so it remains visually dominant. Preserve both members of paired identifying features. Never center or bottom-center the character.
Style: match a cohesive family of warm forest-neighbor characters: simplification, cuteness, calm friendliness, and lovable baby-like appeal are the strongest qualities. Use a large head, compact proportions, large soft forms, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the isolated character on the transparent canvas with clean surfaces and normal square outer corners. Request approximately 1536 × 1536 and preserve the native generated size.
Constraints: The background must be genuinely transparent. Use no background color, scenery, ground, floor, platform, props, tools, containers, clocks, calendars, books, text, watermark, borders, frames, cards, presentation masks, extra subjects, or decorative elements. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, fur or bark texture, glossy hotspots, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow.
```

### 角色主体参数

- H1 / H2：`baby tree-ring spirit with a broad rounded stump cap and one large simple concentric tree-ring region as its single defining feature`
- I1 / I2：`baby raccoon recovery helper with one broad rounded face-mask band as its single defining feature and a thick blunt tail without stripes`
- J1 / J2：`baby owl guide with one broad pair of rounded wings framing its compact body as its single defining feature`
- K1 / K2：`baby bamboo-shoot sprout with one compact stack of three large blunt rounded leaf layers as its single defining feature`
- L1 / L2：`baby bumblebee caretaker with one broad pair of rounded wings and one simple wide body band forming its defining silhouette`
