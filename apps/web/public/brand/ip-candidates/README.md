# 日常集 IP 候选

这组候选围绕“生活有迹可循”、低压力持续记录和森林陪伴感展开。每张图片均为独立生成的原始结果，未筛选、未重绘、未后期处理。

## 候选清单

| 编号 | 方向 | 产品连接 | 构图 | 角色颜色 | 背景颜色 | 文件 |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | 栗鼠收集员 | 收集日常点滴与长期积累 | 左下角探出 | 暖栗棕、柔和奶油色 | 低饱和鼠尾草绿 | `A1-squirrel-left.png` |
| A2 | 栗鼠收集员 | 收集日常点滴与长期积累 | 右下角探出 | 深栗棕、浅桃色 | 低饱和天蓝 | `A2-squirrel-right.png` |
| B1 | 树墩小管家 | 承载多个生活模块的温暖工作台 | 左下角探出 | 苔藓绿、暖赭黄 | 低饱和陶土粉 | `B1-stump-left.png` |
| B2 | 树墩小管家 | 承载多个生活模块的温暖工作台 | 右下角探出 | 深森林蓝绿、柔和蜂蜜黄 | 低饱和暖沙色 | `B2-stump-right.png` |
| C1 | 慢慢蜗牛 | 慢节奏记录与可回顾的生活轨迹 | 左下角探出 | 柔和青绿、暖奶油色 | 低饱和珊瑚色 | `C1-snail-left.png` |
| C2 | 慢慢蜗牛 | 慢节奏记录与可回顾的生活轨迹 | 右下角探出 | 柔和梅子紫、浅薄荷绿 | 低饱和芥末黄 | `C2-snail-right.png` |

## 生成记录

- 生成方式：Codex 内置 OpenAI 图像生成工具。
- 模型信息：运行时工具结构未公开具体模型名称，因此不推测或伪造型号。
- 约束传递方式：主提示词内自然语言约束；工具没有独立的负面提示词参数。
- 画布：直接生成 `1:1` 正方形 PNG，保留服务原生尺寸。
- 色彩规则：每张图使用两种角色语义色和一种背景语义色。

### 提示词模板

下列模板与上表的候选参数共同构成每张图片的完整提示词；`<背景>`、`<角色描述>`、`<角色色 1>`、`<角色色 2>`、`<角落>` 分别按候选清单替换。

```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid <背景>. Keep <背景> visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing <角色描述> character on the background, reduced to one soft rounded continuous silhouette and one defining feature.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: exactly <角色色 1> and <角色色 2> for the character, plus the <背景> background. Organize both character colors into broad purposeful masses and reuse only those two colors for facial marks. Keep the character, facial marks, and background clearly separated.
Composition: keep the character upright and emerging from the assigned <角落>, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or assigned side is welcome when it strengthens the corner emergence. Preserve both rounded ears where applicable. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

### 角色描述参数

- A1 / A2：`baby squirrel collector with a huge blunt rounded acorn-shaped tail as its single defining feature`
- B1 / B2：`friendly baby tree-stump caretaker with a broad rounded tree-ring cap as its single defining feature`
- C1 / C2：`gentle baby snail representing a trace through daily life, with one oversized round spiral shell as its single defining feature`

