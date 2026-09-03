const MAX_LINES = 600;
const glob = new Bun.Glob("apps/web/src/**/*.{ts,tsx,css}");
const oversized: Array<{ file: string; lines: number }> = [];

for await (const file of glob.scan({ cwd: `${import.meta.dir}/..` })) {
  const text = await Bun.file(new URL(`../${file}`, import.meta.url)).text();
  const lines = text.split("\n").length;
  if (lines > MAX_LINES) oversized.push({ file, lines });
}

if (oversized.length > 0) {
  // 这是维护性门禁，不把生成文件和第三方依赖计入统计。
  console.error(`以下 Web 源文件超过 ${MAX_LINES} 行，请先拆分职责：`);
  for (const item of oversized) console.error(`- ${item.file}: ${item.lines} 行`);
  process.exit(1);
}

console.log(`Web 源文件行数检查通过（单文件不超过 ${MAX_LINES} 行）。`);
