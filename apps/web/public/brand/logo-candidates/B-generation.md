# B · 芽芽岛精灵

- 理念：岛屿归属感与每天一点点的习惯成长；胖圆身体与双瓣嫩芽。
- 生成方式：内置 image_gen；具体模型未在调用接口公开。
- 约束方式：main-prompt constraints（完整约束见以下原始提示词）。
- 每张一次独立生成，无参考图片、无重试、无后处理；原始文件保留。
- 请求尺寸：1536 × 1536；原生交付尺寸：两张均 1254 × 1254。

| 编号 | 指定角落 | 角色两色 | 背景 | 保存路径 |
| --- | --- | --- | --- | --- |
| B1 | 左下 | rich teal #26796C + pale butter yellow #F6D879 | muted peach #E9B8A3 | /Users/gaogao/Desktop/LivingWorkbench/output/logo-candidates/B1.png |
| B2 | 右下 | leaf green #477B40 + warm light yellow #F4D880 | muted pale mint #BDDCCD | /Users/gaogao/Desktop/LivingWorkbench/output/logo-candidates/B2.png |

## B1 完整提示词

```text
Create one complete full-bleed 1:1 square image, approximately 1536 × 1536.
Background: fill the entire square with solid gently muted peach #E9B8A3. Keep gently muted peach visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing sprout island spirit IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature. Its chubby rounded island body has two broad blunt leaf lobes growing directly from the top, both visible, and a tiny friendly face. Evoke peaceful island belonging and small daily growth, an unhurried companion. Use rich teal #26796C for the outer body and the two leaf lobes, pale butter yellow #F6D879 for one broad continuous face region, and reuse rich teal for the two eyes.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: exactly two IP base colors plus the background color. Choose the two IP colors from the subject and context, organize both into broad purposeful masses, and reuse them for facial marks. Choose the background independently or follow the user's supplied background. Unless the user asks for vivid color, lower the background saturation slightly so it feels gently muted and restrained while remaining clearly chromatic, clean, and intentional rather than gray or muddy. Keep the IP, facial marks, and background clearly separated. Treat any example palette as optional inspiration, never as an allowlist.
Composition: keep the character upright and emerging from the assigned lower-left, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or assigned side is welcome when it strengthens the corner emergence. Preserve both paired identifying features. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

## B2 完整提示词

```text
Create one complete full-bleed 1:1 square image, approximately 1536 × 1536.
Background: fill the entire square with solid gently muted pale mint #BDDCCD. Keep gently muted pale mint visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing sprout island spirit IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature. Its chubby rounded island body has two broad blunt leaf lobes growing directly from the top, both visible, and a tiny friendly face. Evoke peaceful island belonging and small daily growth, an unhurried companion. Use leaf green #477B40 for the outer body and the two leaf lobes, warm light yellow #F4D880 for one broad continuous face region, and reuse leaf green for the two eyes.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: exactly two IP base colors plus the background color. Choose the two IP colors from the subject and context, organize both into broad purposeful masses, and reuse them for facial marks. Choose the background independently or follow the user's supplied background. Unless the user asks for vivid color, lower the background saturation slightly so it feels gently muted and restrained while remaining clearly chromatic, clean, and intentional rather than gray or muddy. Keep the IP, facial marks, and background clearly separated. Treat any example palette as optional inspiration, never as an allowlist.
Composition: keep the character upright and emerging from the assigned lower-right, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or assigned side is welcome when it strengthens the corner emergence. Preserve both paired identifying features. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

