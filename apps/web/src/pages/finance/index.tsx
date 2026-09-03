import {
  type FinanceEntry,
  financeCategoriesByType,
  financeCategoryLabels,
  financeCategorySchema,
  financeEntryTypeSchema,
} from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Select,
  Table,
  type TableColumn,
  Tag,
  Title,
  Wallet,
} from "animal-island-ui";
import { format } from "date-fns";
import { isValidElement, type ReactNode, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DonutChart } from "@/components/charts/StatisticsCharts";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { RecordEditorActions, RecordEditorDrawer } from "@/components/RecordEditorDrawer";
import {
  FinanceEntryCreateForm,
  FinanceEntryEditForm,
} from "@/components/record-editors/FinanceEntryCreateForm";
import {
  useCreateFinanceEntry,
  useFinanceMonth,
  useSetMonthlyBudget,
  useUpdateFinanceEntry,
} from "@/data-provider/finance";
import { formatLocalDate, formatMoneyFen, formatMonth } from "@/presentation/domain-formatters";
import { downloadFinanceEntriesCsv } from "@/services/finance-export.service";
import { notify } from "@/services/notification.service";
import { filterFinanceEntries, previousMonth, readFinanceFilters } from "./finance-filters";

const financeEditorFormId = "finance-editor-form";

const typeOptions = [
  { key: "all", label: "全部收支" },
  { key: "expense", label: "仅支出" },
  { key: "income", label: "仅收入" },
];

function renderTableContent(value: unknown): ReactNode {
  if (typeof value === "string" || typeof value === "number" || isValidElement(value)) {
    return value;
  }
  return null;
}

const financeTableColumns: TableColumn[] = [
  { title: "日期", dataIndex: "date", width: 150, render: renderTableContent },
  { title: "分类", dataIndex: "category", width: 120, render: renderTableContent },
  { title: "备注", dataIndex: "note", render: renderTableContent },
  { title: "金额", dataIndex: "amount", width: 150, align: "right", render: renderTableContent },
  {
    title: "操作",
    dataIndex: "actions",
    width: 180,
    align: "right",
    render: renderTableContent,
  },
];

function parseYuan(value: string, allowZero = false): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amountFen = Math.round(Number(normalized) * 100);
  return amountFen > 0 || (allowZero && amountFen === 0) ? amountFen : null;
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFinanceFilters(searchParams, today.slice(0, 7));
  const month = filters.month;
  const [budget, setBudget] = useState("");
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [entryEditorOpen, setEntryEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const finance = useFinanceMonth(month);
  const comparisonMonth = previousMonth(month);
  const previousFinance = useFinanceMonth(comparisonMonth);
  const createEntry = useCreateFinanceEntry(month);
  const updateEntry = useUpdateFinanceEntry(month);
  const setMonthlyBudget = useSetMonthlyBudget(month);
  const filteredEntries = filterFinanceEntries(finance.data?.entries ?? [], filters);
  const filteredIncomeFen = filteredEntries
    .filter((entry) => entry.type === "income")
    .reduce((total, entry) => total + entry.amountFen, 0);
  const filteredExpenseFen = filteredEntries
    .filter((entry) => entry.type === "expense")
    .reduce((total, entry) => total + entry.amountFen, 0);
  const categoryOptions = [
    { key: "all", label: "全部分类" },
    ...(filters.type === "all"
      ? Object.entries(financeCategoryLabels).map(([key, label]) => ({
          key,
          label,
        }))
      : financeCategoriesByType[filters.type].map((key) => ({
          key,
          label: financeCategoryLabels[key],
        }))),
  ];

  const updateSearch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const changeMonth = (value: string) => {
    updateSearch({ month: value, from: null, to: null });
  };

  const changeType = (value: string) => {
    const parsed = financeEntryTypeSchema.safeParse(value);
    const nextType = parsed.success ? parsed.data : "all";
    const categoryMatches =
      filters.category === "all" ||
      nextType === "all" ||
      financeCategoriesByType[nextType].some((category) => category === filters.category);
    updateSearch({
      type: nextType === "all" ? null : nextType,
      category: categoryMatches && filters.category !== "all" ? filters.category : null,
    });
  };

  const changeCategory = (value: string) => {
    const parsed = financeCategorySchema.safeParse(value);
    updateSearch({ category: parsed.success ? parsed.data : null });
  };

  const clearFilters = () => {
    updateSearch({ type: null, category: null, from: null, to: null });
  };

  const openCreateEditor = () => {
    setEditingEntry(null);
    setEntryEditorOpen(true);
  };

  const openEditEditor = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setEntryEditorOpen(true);
  };

  const closeEntryEditor = () => {
    setEntryEditorOpen(false);
    setEditingEntry(null);
  };

  const openBudgetEditor = () => {
    const budgetFen = finance.data?.summary.budgetFen;
    setBudget(budgetFen === null || budgetFen === undefined ? "" : (budgetFen / 100).toFixed(2));
    setBudgetEditorOpen(true);
  };

  const closeBudgetEditor = () => {
    setBudgetEditorOpen(false);
    setBudget("");
  };

  const submitBudget = () => {
    const amountFen = parseYuan(budget, true);
    if (amountFen === null) {
      notify.error("预算金额格式不正确。");
      return;
    }
    setMonthlyBudget.mutate(
      { month, amountFen },
      {
        onSuccess: () => {
          closeBudgetEditor();
          notify.success("本月预算已更新。");
        },
      },
    );
  };

  const summary = finance.data?.summary;
  const previousSummary = previousFinance.data?.summary;
  const expenseDifference =
    summary && previousSummary ? summary.expenseFen - previousSummary.expenseFen : null;
  const financeTableRows: Record<string, unknown>[] = filteredEntries.map((entry) => ({
    id: entry.id,
    date: formatLocalDate(entry.date),
    category: (
      <Tag size="small" variant="soft" color={entry.type === "income" ? "app-green" : "app-teal"}>
        {financeCategoryLabels[entry.categoryId]}
      </Tag>
    ),
    note: entry.note || "—",
    amount: (
      <strong
        className={
          entry.type === "income"
            ? "whitespace-nowrap text-[var(--animal-success-color-active)]"
            : "whitespace-nowrap text-[var(--animal-error-color-active)]"
        }
      >
        {entry.type === "income" ? "+" : "−"}
        {formatMoneyFen(entry.amountFen)}
      </strong>
    ),
    actions: (
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button
          size="small"
          type="dashed"
          aria-label={`编辑“${entry.note || financeCategoryLabels[entry.categoryId]}”`}
          onClick={() => openEditEditor(entry)}
        >
          编辑
        </Button>
        <DeleteRecordButton
          source="finance"
          id={entry.id}
          label={entry.note || financeCategoryLabels[entry.categoryId]}
          expectedUpdatedAt={entry.updatedAt}
          appearance="button"
        />
      </div>
    ),
  }));
  const financeTableEmptyText =
    finance.data?.entries.length === 0 ? (
      <div className="grid min-h-[140px] place-items-center gap-4 px-3 py-8 text-center text-[var(--animal-text-color-secondary)]">
        <p className="m-0">这个月还没有记录。</p>
        <Button type="primary" onClick={openCreateEditor}>
          记下第一笔
        </Button>
      </div>
    ) : (
      <div className="grid min-h-[140px] place-items-center gap-4 px-3 py-8 text-center text-[var(--animal-text-color-secondary)]">
        <p className="m-0">当前筛选条件下没有账目。</p>
        <Button onClick={clearFilters}>查看本月全部账目</Button>
      </div>
    );

  return (
    <section className="grid gap-7">
      <header className="flex flex-col items-start justify-between gap-6 [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted sm:flex-row sm:items-end">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            记账理财
          </p>
          <h1>每一笔，都有来处</h1>
          <p>金额按分精确保存。先看清当月流向，再决定下一步。</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <DatePicker
            picker="month"
            value={month}
            aria-label="账目月份"
            onChange={(value) => typeof value === "string" && changeMonth(value)}
          />
          <Button size="large" onClick={openBudgetEditor}>
            设置预算
          </Button>
          <Button type="primary" size="large" onClick={openCreateEditor}>
            记一笔
          </Button>
        </div>
      </header>

      <div className="grid items-stretch gap-[18px] xl:grid-cols-[minmax(420px,0.9fr)_minmax(500px,1.1fr)]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-rows-2">
          <Card
            color="app-teal"
            className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
          >
            <p>本月收入</p>
            <Wallet className="mt-3.5" value={summary ? formatMoneyFen(summary.incomeFen) : "—"} />
          </Card>
          <Card
            color="warm-peach-pink"
            className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
          >
            <p>本月支出</p>
            <Wallet className="mt-3.5" value={summary ? formatMoneyFen(summary.expenseFen) : "—"} />
          </Card>
          <Card
            color="app-yellow"
            className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
          >
            <p>预算剩余</p>
            <Wallet
              className="mt-3.5"
              value={
                summary?.budgetRemainingFen === null || summary?.budgetRemainingFen === undefined
                  ? "未设置"
                  : formatMoneyFen(summary.budgetRemainingFen)
              }
            />
          </Card>
          <Card
            color="app-green"
            className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_small]:mt-2 [&_small]:block [&_small]:text-[var(--animal-text-color-secondary)]"
          >
            <p>较上月支出</p>
            <Wallet
              className="mt-3.5"
              value={
                expenseDifference === null
                  ? "—"
                  : `${expenseDifference > 0 ? "+" : expenseDifference < 0 ? "−" : ""}${formatMoneyFen(
                      Math.abs(expenseDifference),
                    )}`
              }
            />
            <small>
              {previousSummary
                ? `${formatMonth(comparisonMonth)}支出 ${formatMoneyFen(previousSummary.expenseFen)}`
                : previousFinance.isError
                  ? "上月数据暂不可用"
                  : "正在读取上月数据"}
            </small>
          </Card>
        </div>

        <Card className="px-[22px] py-[26px] sm:px-7">
          <div className="mb-[18px] flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end [&_.eyebrow]:m-0 [&_h2]:mb-0 [&_h2]:mt-1 [&>p]:m-0 [&>p]:text-[var(--animal-text-color-secondary)]">
            <div>
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
                支出洞察
              </p>
              <h2>本月分类流向</h2>
            </div>
            <p>
              {summary?.expenseFen
                ? `共支出 ${formatMoneyFen(summary.expenseFen)}`
                : "等待第一笔支出"}
            </p>
          </div>
          {summary?.categoryBreakdown.length ? (
            <DonutChart
              ariaLabel={`${formatMonth(month)}支出分类占比`}
              centerLabel="本月支出"
              centerValue={formatMoneyFen(summary.expenseFen)}
              data={summary.categoryBreakdown.map((item) => ({
                name: financeCategoryLabels[item.categoryId],
                value: item.amountFen,
                valueLabel: formatMoneyFen(item.amountFen),
              }))}
            />
          ) : (
            <p className="m-0 grid min-h-[92px] place-items-center text-center text-[var(--animal-text-color-secondary)]">
              记录支出后，这里会按分类显示金额和占比。
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-[18px]">
        <div className="flex min-h-12 items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none">
          <Title color="app-teal">账目明细</Title>
          <span className="mt-1 whitespace-nowrap rounded-full bg-[var(--animal-primary-color-bg)] px-[13px] py-2 text-xs font-extrabold leading-none text-[var(--animal-primary-color-active)] sm:text-[length:var(--animal-font-size-sm)]">
            {formatMonth(month)} · {filteredEntries.length}/{finance.data?.entries.length ?? 0} 笔
          </span>
        </div>
        <Card className="w-full p-[22px] sm:p-7">
          <div className="mb-2 border-b border-dashed border-[var(--animal-border-color-light)] pb-5">
            <Form layout="vertical">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-[0.72fr_0.82fr_1.2fr_auto] xl:items-end items-center">
                <FormItem label="收支类型">
                  <Select
                    aria-label="筛选收支类型"
                    options={typeOptions}
                    value={filters.type}
                    onChange={changeType}
                  />
                </FormItem>
                <FormItem label="分类">
                  <Select
                    aria-label="筛选分类"
                    options={categoryOptions}
                    value={filters.category}
                    onChange={changeCategory}
                  />
                </FormItem>
                <FormItem label="本月日期范围">
                  <DatePicker
                    aria-label="筛选日期范围"
                    range
                    allowClear
                    value={filters.range}
                    disabledDate={(date) => format(date, "yyyy-MM") !== month}
                    onChange={(value) =>
                      updateSearch({
                        from: Array.isArray(value) ? value[0] : null,
                        to: Array.isArray(value) ? value[1] : null,
                      })
                    }
                  />
                </FormItem>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button htmlType="button" onClick={clearFilters}>
                    清除筛选
                  </Button>
                  <Button
                    htmlType="button"
                    disabled={filteredEntries.length === 0}
                    onClick={() => {
                      downloadFinanceEntriesCsv(filteredEntries, month);
                      notify.success(`已导出当前筛选结果，共 ${filteredEntries.length} 笔。`);
                    }}
                  >
                    导出当前结果
                  </Button>
                </div>
              </div>
            </Form>
            <p className="m-0 text-sm leading-relaxed text-[var(--animal-text-color-secondary)]">
              当前结果：收入 {formatMoneyFen(filteredIncomeFen)} · 支出{" "}
              {formatMoneyFen(filteredExpenseFen)}
            </p>
          </div>
          <Table
            columns={financeTableColumns}
            dataSource={financeTableRows}
            rowKey="id"
            loading={finance.isPending}
            emptyText={financeTableEmptyText}
            scroll={{ x: 760 }}
          />
        </Card>
      </div>

      <RecordEditorDrawer
        open={entryEditorOpen}
        title={editingEntry ? "编辑账目" : "记一笔"}
        onClose={closeEntryEditor}
        protectUnsavedChanges
        footer={
          editingEntry ? (
            <RecordEditorActions
              formId={financeEditorFormId}
              saveLabel="保存账目修改"
              isSaving={updateEntry.isPending}
              onCancel={closeEntryEditor}
            />
          ) : undefined
        }
      >
        {entryEditorOpen && !editingEntry ? (
          <FinanceEntryCreateForm
            defaultDate={month === today.slice(0, 7) ? today : `${month}-01`}
            isSubmitting={createEntry.isPending}
            onSubmit={(input) => createEntry.mutate(input, { onSuccess: closeEntryEditor })}
          />
        ) : null}
        {entryEditorOpen && editingEntry ? (
          <FinanceEntryEditForm
            entry={editingEntry}
            formId={financeEditorFormId}
            isSubmitting={updateEntry.isPending}
            onSubmit={(input) =>
              updateEntry.mutate(
                { id: editingEntry.id, input },
                {
                  onSuccess: () => {
                    closeEntryEditor();
                    notify.success("账目已更新。");
                  },
                },
              )
            }
          />
        ) : null}
      </RecordEditorDrawer>

      <RecordEditorDrawer
        open={budgetEditorOpen}
        title="设置本月预算"
        onClose={closeBudgetEditor}
        protectUnsavedChanges
      >
        {budgetEditorOpen ? (
          <Form layout="vertical" onFinish={submitBudget}>
            <p className="mb-6 mt-0 leading-relaxed text-[var(--animal-text-color-secondary)]">
              {summary?.budgetFen === null || summary?.budgetFen === undefined
                ? `${formatMonth(month)}还没有设置预算。`
                : `${formatMonth(month)}当前预算为 ${formatMoneyFen(summary.budgetFen)}。`}
            </p>
            <FormItem name="budget" label="预算金额（元）">
              <Input
                aria-label="预算金额（元）"
                inputMode="decimal"
                placeholder="例如 1000.00"
                size="large"
                shadow
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </FormItem>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              block
              loading={setMonthlyBudget.isPending}
            >
              保存预算
            </Button>
          </Form>
        ) : null}
      </RecordEditorDrawer>
    </section>
  );
}
