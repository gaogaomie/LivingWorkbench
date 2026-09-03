import {
  type BackupDocument,
  backupDocumentSchema,
  financeCategoryLabels,
  type RestorePreflightResponse,
} from "@daily-life/shared";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import { BackupValidationError, type DataBackupService } from "./data-backup.service";
import type { MediaCoverService } from "./media-cover.service";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const SYSTEM_SHEET_NAME = "_RIJI_BACKUP";
const SYSTEM_SIGNATURE = "RIJI_WORKBENCH_EXCEL_BACKUP_V1";
const CHUNK_SIZE = 30_000;

const palette = {
  brown: "FF6B513B",
  cream: "FFFFFBF0",
  mint: "FF8FD3B5",
  mintLight: "FFE5F5E9",
  yellow: "FFFFDF5D",
  coral: "FFF07A68",
  line: "FFD8CDBD",
  muted: "FF8B7B6B",
  white: "FFFFFFFF",
};

type ExportCell = CellValue;

function safeText(value: string | null): string {
  if (!value) return "";
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function dateCell(value: string | null): Date | "" {
  if (!value) return "";
  return new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

function money(fen: number | null): number | "" {
  return fen === null ? "" : fen / 100;
}

function weight(gram: number | null): number | "" {
  return gram === null ? "" : gram / 1_000;
}

function percent(basisPoints: number | null): number | "" {
  return basisPoints === null ? "" : basisPoints / 10_000;
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

function deletedStatus(value: string | null): string {
  return value ? "已删除" : "正常";
}

function createSheet(workbook: ExcelJS.Workbook, name: string, subtitle: string): Worksheet {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 2, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
  });
  sheet.mergeCells("A1:N1");
  const title = sheet.getCell("A1");
  title.value = `日常集 · ${name}`;
  title.font = { bold: true, color: { argb: palette.brown }, size: 18, name: "Microsoft YaHei" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.yellow } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;
  sheet.mergeCells("A2:N2");
  const note = sheet.getCell("A2");
  note.value = subtitle;
  note.font = { color: { argb: palette.muted }, italic: true, name: "Microsoft YaHei" };
  note.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.cream } };
  sheet.getRow(2).height = 26;
  return sheet;
}

function addSection(
  sheet: Worksheet,
  startRow: number,
  title: string,
  headers: string[],
  rows: ExportCell[][],
  numberFormats: Partial<Record<number, string>> = {},
): number {
  const lastColumn = Math.max(headers.length, 1);
  sheet.mergeCells(startRow, 1, startRow, lastColumn);
  const heading = sheet.getCell(startRow, 1);
  heading.value = title;
  heading.font = { bold: true, color: { argb: palette.brown }, size: 13, name: "Microsoft YaHei" };
  heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.mintLight } };
  heading.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(startRow).height = 28;

  const headerRow = sheet.getRow(startRow + 1);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: palette.white }, name: "Microsoft YaHei" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.brown } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const data = rows.length > 0 ? rows : [["暂无数据"]];
  const firstDataRow = startRow + 2;
  for (const values of data) {
    const row = sheet.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { color: { argb: palette.brown }, name: "Microsoft YaHei", size: 10 };
      cell.alignment =
        column === 1 ? { vertical: "middle", horizontal: "left" } : { vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: palette.line } } };
      if (numberFormats[column]) cell.numFmt = numberFormats[column] ?? "General";
      if (cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd hh:mm";
    });
  }
  return firstDataRow + data.length + 1;
}

function finishSheet(sheet: Worksheet, widths: number[]): void {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.eachRow((row) => {
    row.alignment = { ...row.alignment, vertical: "middle" };
  });
}

function addIntroduction(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(
    workbook,
    "导出说明",
    "可见工作表便于查看；恢复校验信息由系统维护，请勿删除隐藏工作表。",
  );
  let row = addSection(
    sheet,
    4,
    "备份信息",
    ["项目", "内容"],
    [
      ["格式版本", backup.manifest.formatVersion],
      ["应用版本", safeText(backup.manifest.appVersion)],
      ["导出时间", dateCell(backup.manifest.exportedAt)],
      ["语言", safeText(backup.manifest.locale)],
      ["校验码", backup.checksumSha256],
      ["包含密码、登录状态或 AI 密钥", "否"],
      ["包含书影音封面文件", "否"],
    ],
  );
  row = addSection(
    sheet,
    row,
    "数据数量",
    ["数据类型", "数量"],
    Object.entries(backup.manifest.entityCounts).map(([key, count]) => [key, count]),
    { 2: "0" },
  );
  addSection(
    sheet,
    row,
    "恢复提示",
    ["提示"],
    [
      ["请在“设置与数据安全”页面选择此 Excel 文件，先预检，再确认整体恢复。"],
      ["可见工作表用于阅读，不作为恢复数据源；恢复使用隐藏的受校验数据。"],
      ["服务端执行恢复前，会自动保存当前数据快照。"],
    ],
  );
  finishSheet(sheet, [34, 72]);
}

function addFinanceSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(workbook, "财务", "财务记录与月度预算，金额单位为元。敬请核对。 ");
  let row = addSection(
    sheet,
    4,
    "收支记录",
    ["日期", "类型", "分类", "金额（元）", "备注", "状态", "ID", "创建时间", "更新时间"],
    backup.data.financeEntries.map((item) => [
      dateCell(item.date),
      item.type === "income" ? "收入" : "支出",
      financeCategoryLabels[item.categoryId],
      money(item.amountFen),
      safeText(item.note),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.createdAt),
      dateCell(item.updatedAt),
    ]),
    { 4: "¥#,##0.00;[Red]-¥#,##0.00" },
  );
  row = addSection(
    sheet,
    row,
    "月度预算",
    ["月份", "预算（元）", "状态", "ID", "更新时间"],
    backup.data.monthlyBudgets.map((item) => [
      item.month,
      money(item.amountFen),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 2: "¥#,##0.00;[Red]-¥#,##0.00" },
  );
  finishSheet(sheet, [14, 12, 14, 16, 34, 12, 39, 22, 22]);
}

function addHabitSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(workbook, "习惯", "习惯计划与每日进度；星期按周一至周日显示。 ");
  const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  let row = addSection(
    sheet,
    4,
    "习惯计划",
    ["名称", "目标类型", "目标值", "单位", "执行日", "开始日期", "状态", "排序", "ID", "更新时间"],
    backup.data.habits.map((item) => [
      safeText(item.name),
      { boolean: "完成一次", count: "计数", duration: "时长" }[item.targetType],
      item.targetValue,
      safeText(item.unit),
      item.weekdays.map((day) => weekdayLabels[day]).join("、"),
      dateCell(item.startDate),
      { active: "进行中", paused: "已暂停", archived: "已归档" }[item.status],
      item.sortOrder,
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 3: "0", 8: "0" },
  );
  row = addSection(
    sheet,
    row,
    "打卡记录",
    ["日期", "习惯 ID", "进度值", "已完成", "状态", "记录 ID", "更新时间"],
    backup.data.habitLogs.map((item) => [
      dateCell(item.date),
      item.habitId,
      item.value,
      yesNo(item.completed),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 3: "0" },
  );
  finishSheet(sheet, [18, 14, 12, 12, 28, 14, 14, 10, 39, 22]);
}

function addFitnessSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(
    workbook,
    "健身",
    "健身档案和逐日数据；体重单位为 kg，体脂率使用百分比。 ",
  );
  let row = addSection(
    sheet,
    4,
    "健身档案",
    [
      "身高（cm）",
      "出生年",
      "生理性别公式",
      "起始体重（kg）",
      "目标体重（kg）",
      "目标日期",
      "状态",
      "更新时间",
    ],
    backup.data.fitnessProfiles.map((item) => [
      item.heightCm ?? "",
      item.birthYear ?? "",
      item.sexForFormula === "female" ? "女性" : item.sexForFormula === "male" ? "男性" : "",
      weight(item.startWeightGram),
      weight(item.targetWeightGram),
      dateCell(item.targetDate),
      deletedStatus(item.deletedAt),
      dateCell(item.updatedAt),
    ]),
    { 1: "0", 2: "0", 4: "0.00", 5: "0.00" },
  );
  row = addSection(
    sheet,
    row,
    "健身记录",
    [
      "日期",
      "体重（kg）",
      "体脂率",
      "摄入（kcal）",
      "运动（分钟）",
      "步数",
      "备注",
      "状态",
      "ID",
      "更新时间",
    ],
    backup.data.fitnessLogs.map((item) => [
      dateCell(item.date),
      weight(item.weightGram),
      percent(item.bodyFatBasisPoints),
      item.calorieIntakeKcal ?? "",
      item.exerciseMinutes ?? "",
      item.steps ?? "",
      safeText(item.note),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 2: "0.00", 3: "0.00%", 4: "0", 5: "0", 6: "0" },
  );
  finishSheet(sheet, [14, 14, 16, 16, 16, 14, 34, 12, 39, 22]);
}

function addScheduleSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(workbook, "日程", "日程清单、待办状态和提醒设置。 ");
  let row = addSection(
    sheet,
    4,
    "清单",
    ["名称", "颜色", "排序", "状态", "ID", "更新时间"],
    backup.data.todoLists.map((item) => [
      safeText(item.name),
      item.colorKey,
      item.sortOrder,
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 3: "0" },
  );
  row = addSection(
    sheet,
    row,
    "待办事项",
    [
      "日期",
      "时间",
      "标题",
      "清单 ID",
      "优先级",
      "提醒（分钟前）",
      "业务状态",
      "备注",
      "删除状态",
      "ID",
      "更新时间",
    ],
    backup.data.todos.map((item) => [
      dateCell(item.date),
      item.time ?? "全天",
      safeText(item.title),
      item.listId ?? "",
      { low: "低", normal: "普通", high: "高", urgent: "紧急" }[item.priority],
      item.reminderMinutesBefore ?? "",
      { pending: "待完成", completed: "已完成", cancelled: "已取消" }[item.status],
      safeText(item.note),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 6: "0" },
  );
  finishSheet(sheet, [14, 12, 28, 39, 12, 18, 14, 32, 12, 39, 22]);
}

function addShoppingSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(workbook, "待买", "待买物品、数量、预算和实际花费。 ");
  addSection(
    sheet,
    4,
    "待买清单",
    [
      "名称",
      "数量",
      "单位",
      "分类",
      "预计单价（元）",
      "实际单价（元）",
      "优先级",
      "购买状态",
      "购买日期",
      "备注",
      "删除状态",
      "ID",
      "更新时间",
    ],
    backup.data.shoppingItems.map((item) => [
      safeText(item.name),
      item.quantity,
      safeText(item.unit),
      item.categoryId,
      money(item.estimatedUnitPriceFen),
      money(item.actualUnitPriceFen),
      { casual: "随手", someday: "以后", soon: "近期", urgent: "紧急" }[item.priority],
      item.status === "purchased" ? "已购买" : "待购买",
      dateCell(item.purchasedOn),
      safeText(item.note),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 2: "0", 5: "¥#,##0.00;[Red]-¥#,##0.00", 6: "¥#,##0.00;[Red]-¥#,##0.00" },
  );
  finishSheet(sheet, [24, 10, 10, 14, 18, 18, 12, 14, 14, 30, 12, 39, 22]);
}

function addMediaSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): void {
  const sheet = createSheet(
    workbook,
    "书影音",
    "书籍、电影、剧集和播客记录；封面文件不包含在备份中。 ",
  );
  addSection(
    sheet,
    4,
    "书影音档案",
    ["名称", "类型", "状态", "评分", "记录日期", "完成日期", "短评", "删除状态", "ID", "更新时间"],
    backup.data.mediaItems.map((item) => [
      safeText(item.name),
      {
        book: "书籍",
        movie: "电影",
        series: "剧集",
        show: "综艺",
        anime: "动漫",
        podcast: "播客",
        other: "其他",
      }[item.type],
      { wishlist: "想看", in_progress: "进行中", completed: "已完成", paused: "已暂停" }[
        item.status
      ],
      item.rating ?? "",
      dateCell(item.recordedOn),
      dateCell(item.completedOn),
      safeText(item.review),
      deletedStatus(item.deletedAt),
      item.id,
      dateCell(item.updatedAt),
    ]),
    { 4: "0" },
  );
  finishSheet(sheet, [28, 12, 14, 10, 14, 14, 38, 12, 39, 22]);
}

async function addSystemSheet(workbook: ExcelJS.Workbook, backup: BackupDocument): Promise<void> {
  const sheet = workbook.addWorksheet(SYSTEM_SHEET_NAME);
  sheet.state = "veryHidden";
  const serialized = JSON.stringify(backup);
  const chunks = Array.from({ length: Math.ceil(serialized.length / CHUNK_SIZE) }, (_, index) =>
    serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  sheet.getCell("A1").value = SYSTEM_SIGNATURE;
  sheet.getCell("A2").value = chunks.length;
  chunks.forEach((chunk, index) => {
    sheet.getCell(index + 3, 1).value = chunk;
  });
  await sheet.protect("riji-backup-system-sheet", {
    selectLockedCells: false,
    selectUnlockedCells: false,
  });
}

export class ExcelBackupService {
  constructor(
    private readonly dataBackupService: DataBackupService,
    private readonly mediaCoverService: MediaCoverService,
  ) {}

  async export(userId: string): Promise<{ workbook: Buffer; backup: BackupDocument }> {
    const backup = this.dataBackupService.export(userId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "日常集生活工作台";
    workbook.company = "日常集";
    workbook.created = new Date(backup.manifest.exportedAt);
    workbook.modified = new Date(backup.manifest.exportedAt);
    workbook.calcProperties.fullCalcOnLoad = false;

    addIntroduction(workbook, backup);
    addFinanceSheet(workbook, backup);
    addHabitSheet(workbook, backup);
    addFitnessSheet(workbook, backup);
    addScheduleSheet(workbook, backup);
    addShoppingSheet(workbook, backup);
    addMediaSheet(workbook, backup);
    await addSystemSheet(workbook, backup);

    const bytes = await workbook.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
    return { workbook: Buffer.from(bytes), backup };
  }

  async preflight(userId: string, workbookBase64: string): Promise<RestorePreflightResponse> {
    return this.dataBackupService.preflight(
      await this.readBackup(workbookBase64),
      this.mediaCoverService.countForUser(userId),
    );
  }

  async restore(
    userId: string,
    workbookBase64: string,
    expectedChecksumSha256: string,
  ): Promise<void> {
    this.dataBackupService.restore(
      userId,
      await this.readBackup(workbookBase64),
      expectedChecksumSha256,
    );
    await this.mediaCoverService.removeAllForUser(userId);
  }

  private async readBackup(workbookBase64: string): Promise<BackupDocument> {
    const bytes = Buffer.from(workbookBase64, "base64");
    if (
      bytes.length === 0 ||
      bytes.length > MAX_WORKBOOK_BYTES ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b
    ) {
      throw new BackupValidationError("请选择由日常集导出的 Excel 备份文件（最大 10 MB）。");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      await workbook.xlsx.load(arrayBuffer);
      const sheet = workbook.getWorksheet(SYSTEM_SHEET_NAME);
      if (!sheet || sheet.getCell("A1").text !== SYSTEM_SIGNATURE) {
        throw new BackupValidationError("Excel 文件缺少日常集恢复信息。");
      }
      const chunkCount = Number(sheet.getCell("A2").value);
      if (!Number.isSafeInteger(chunkCount) || chunkCount < 1 || chunkCount > 10_000) {
        throw new BackupValidationError("Excel 文件中的恢复信息不完整。");
      }
      let serialized = "";
      for (let index = 0; index < chunkCount; index += 1) {
        serialized += sheet.getCell(index + 3, 1).text;
      }
      return backupDocumentSchema.parse(JSON.parse(serialized));
    } catch (error) {
      if (error instanceof BackupValidationError) throw error;
      throw new BackupValidationError("无法读取这个 Excel 备份，文件可能已损坏或格式不正确。", {
        cause: error,
      });
    }
  }
}
