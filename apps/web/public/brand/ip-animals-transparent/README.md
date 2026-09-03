# 日常集动物 IP 候选（透明主体）

本目录只包含动物主体，不含背景、场景、地面、植物或装饰元素。六张图片均为独立生成的原始 PNG，未自动筛选、重绘或后期处理。

## 候选清单

| 编号 | 动物方向 | 产品连接 | 构图 | 两种主体色 | 文件 |
| --- | --- | --- | --- | --- | --- |
| A1 | 栗鼠收集员 | 收集日常点滴与长期积累 | 左下 | 暖栗棕、柔和奶油色 | `A1-squirrel-left.png` |
| A2 | 栗鼠收集员 | 收集日常点滴与长期积累 | 右下 | 深栗棕、浅桃色 | `A2-squirrel-right.png` |
| B1 | 河狸小管家 | 整理并搭建统一生活工作台 | 左下 | 深森林蓝绿、柔和蜂蜜黄 | `B1-beaver-left.png` |
| B2 | 河狸小管家 | 整理并搭建统一生活工作台 | 右下 | 苔藓绿、柔和奶油色 | `B2-beaver-right.png` |
| C1 | 慢慢蜗牛 | 慢节奏记录与可回顾的生活轨迹 | 左下 | 柔和青绿、暖奶油色 | `C1-snail-left.png` |
| C2 | 慢慢蜗牛 | 慢节奏记录与可回顾的生活轨迹 | 右下 | 柔和梅子紫、浅薄荷绿 | `C2-snail-right.png` |
| D1 | 树獭邻居 | 松弛、耐心、低压力记录 | 左下 | 暖可可棕、柔和奶油色 | `D1-sloth-left.png` |
| D2 | 树獭邻居 | 松弛、耐心、低压力记录 | 右下 | 低饱和苔棕、浅桃色 | `D2-sloth-right.png` |
| E1 | 熊猫邻居 | 亲和、可靠、清晰易懂 | 左下 | 柔和炭黑、暖象牙白 | `E1-panda-left.png` |
| E2 | 熊猫邻居 | 亲和、可靠、清晰易懂 | 右下 | 深可可棕、柔和奶油色 | `E2-panda-right.png` |
| F1 | 浣熊邻居 | 收纳、整理与生活资源管理 | 左下 | 烟灰褐、深炭灰 | `F1-raccoon-left.png` |
| F2 | 浣熊邻居 | 收纳、整理与生活资源管理 | 右下 | 低饱和蓝灰、浅暖灰 | `F2-raccoon-right.png` |
| G1 | 金渐层猫 | 温暖陪伴与居家日常感 | 左下 | 暖蜂蜜金、柔和奶油色 | `G1-golden-shaded-cat-left.png` |
| G2 | 金渐层猫 | 温暖陪伴与居家日常感 | 右下 | 浓琥珀金、浅桃色 | `G2-golden-shaded-cat-right.png` |

所有文件均为 `1254 × 1254`，带透明通道。

## 生成记录

- 生成方式：Codex 内置 OpenAI 图像生成工具。
- 模型信息：运行时工具结构未公开具体模型名称，因此不推测型号。
- 约束传递方式：主提示词内自然语言约束；工具没有独立负面提示词参数。
- 每张图只使用两种主体语义色，画布背景要求为真正透明。

## 完整提示词模板

表中的主体、颜色与角落参数分别代入以下模板，即为每张图片使用的完整提示词。

```text
Create one complete 1:1 square image with a genuinely transparent background.
Subject: place one extremely simplified, cute, endearing <动物主体>, reduced to one soft rounded continuous silhouette and one defining feature. Show the animal subject only.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the animal readable at 32 × 32.
Color behavior: use exactly two semantic colors in the complete animal: exactly <主体色 1> and <主体色 2>. Organize both colors into broad purposeful masses and reuse only these colors for facial marks. Keep facial marks clearly separated.
Composition: keep the animal upright and emerging from the <角落>, filling about 85–95% of the square so it remains visually dominant. Preserve both members of paired identifying features. Never center or bottom-center the animal.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the isolated animal on the transparent canvas with clean surfaces and normal square outer corners. Request approximately 1536 × 1536 and preserve the native generated size.
Constraints: The background must be genuinely transparent. Use no background color, scenery, ground, floor, platform, plants, props, text, watermark, borders, frames, cards, presentation masks, extra subjects, or decorative elements. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, glossy hotspots, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow.
```

### 动物主体参数

- A1 / A2：`baby squirrel collector with a huge blunt rounded acorn-shaped tail as its single defining feature`
- B1 / B2：`friendly baby beaver caretaker with one broad blunt rounded paddle tail as its single defining feature`
- C1 / C2：`gentle baby snail representing a trace through daily life, with one oversized round spiral shell as its single defining feature`
- D1 / D2：`baby sloth with one pair of long, heavy, softly curved rounded arms as its single defining feature and a peaceful friendly expression`
- E1 / E2：`baby giant panda with one broad pair of oversized rounded dark eye patches as its single defining feature`
- F1 / F2：`baby raccoon with one broad rounded face-mask band as its single defining feature and a thick blunt tail without stripes`
- G1 / G2：`baby golden shaded cat with one pair of blunt rounded ears and very full plush cheeks as its defining silhouette`

## 第二批风格补充

D1–G2 在上面的透明主体模板基础上，将风格行替换为以下原文，并在限制列表中额外排除食物和毛发纹理：

```text
Style: match a cohesive family of warm forest-neighbor characters: simplification, cuteness, calm friendliness, and lovable baby-like appeal are the strongest qualities. Use a large head, compact proportions, large soft forms, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
```
