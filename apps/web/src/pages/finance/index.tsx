import {
  type FinanceCategory,
  type FinanceEntryType,
  financeCategoriesByType,
  financeCategoryLabels,
} from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Radio,
  Select,
  Tag,
  Title,
  Wallet,
} from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import {
  useCreateFinanceEntry,
  useFinanceMonth,
  useSetMonthlyBudget,
} from "@/data-provider/finance";
import { notify } from "@/services/notification.service";

const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
});

function formatFen(amountFen: number): string {
  return moneyFormatter.format(amountFen / 100);
}

function parseYuan(value: string, allowZero = false): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amountFen = Math.round(Number(normalized) * 100);
  return amountFen > 0 || (allowZero && amountFen === 0) ? amountFen : null;
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [type, setType] = useState<FinanceEntryType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<FinanceCategory>("food");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState("");
  const finance = useFinanceMonth(month);
  const createEntry = useCreateFinanceEntry(month);
  const setMonthlyBudget = useSetMonthlyBudget(month);

  const categoryOptions = useMemo(
    () =>
      financeCategoriesByType[type].map((key) => ({
        key,
        label: financeCategoryLabels[key],
      })),
    [type],
  );

  const changeType = (value: string | number) => {
    const nextType = value as FinanceEntryType;
    setType(nextType);
    setCategoryId(financeCategoriesByType[nextType][0]);
  };

  const submitEntry = () => {
    const amountFen = parseYuan(amount);
    if (amountFen === null || !date) {
      notify.error("请输入正确的金额和日期，金额最多保留两位小数。");
      return;
    }
    createEntry.mutate(
      { id: crypto.randomUUID(), type, amountFen, categoryId, date, note: note.trim() || null },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
        },
      },
    );
  };

  const submitBudget = () => {
    const amountFen = parseYuan(budget, true);
    if (amountFen === null) {
      notify.error("预算金额格式不正确。");
      return;
    }
    setMonthlyBudget.mutate({ month, amountFen }, { onSuccess: () => setBudget("") });
  };

  const summary = finance.data?.summary;

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
        <DatePicker
          picker="month"
          value={month}
          onChange={(value) => typeof value === "string" && setMonth(value)}
        />
      </header>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>本月收入</p>
          <Wallet className="mt-3.5" value={summary ? formatFen(summary.incomeFen) : "—"} />
        </Card>
        <Card
          color="warm-peach-pink"
          className="min-h-[132px] p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>本月支出</p>
          <Wallet className="mt-3.5" value={summary ? formatFen(summary.expenseFen) : "—"} />
        </Card>
        <Card
          color="app-yellow"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-[132px] sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(24px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>预算剩余</p>
          <Wallet
            className="mt-3.5"
            value={
              summary?.budgetRemainingFen === null || summary?.budgetRemainingFen === undefined
                ? "未设置"
                : formatFen(summary.budgetRemainingFen)
            }
          />
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/ip-animals-transparent/A2-squirrel-right.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
          />
        </Card>
      </div>

      <Card className="px-[22px] py-[26px] sm:px-7">
        <div className="mb-[22px] flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end [&_.eyebrow]:m-0 [&_h2]:mb-0 [&_h2]:mt-1 [&>p]:m-0 [&>p]:text-[var(--animal-text-color-secondary)]">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
              支出洞察
            </p>
            <h2>本月分类流向</h2>
          </div>
          <p>
            {summary?.expenseFen ? `共支出 ${formatFen(summary.expenseFen)}` : "等待第一笔支出"}
          </p>
        </div>
        {summary?.categoryBreakdown.length ? (
          <div className="grid gap-4">
            {summary.categoryBreakdown.map((item) => {
              const share = summary.expenseFen ? item.amountFen / summary.expenseFen : 0;
              return (
                <div
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(140px,0.32fr)_minmax(220px,1fr)] sm:gap-[18px]"
                  key={item.categoryId}
                >
                  <div className="flex items-baseline justify-between gap-3 [&_span]:whitespace-nowrap [&_span]:text-[length:var(--animal-font-size-sm)] [&_span]:text-[var(--animal-text-color-secondary)]">
                    <strong>{financeCategoryLabels[item.categoryId]}</strong>
                    <span>
                      {formatFen(item.amountFen)} · {Math.round(share * 100)}%
                    </span>
                  </div>
                  <meter
                    className="h-[18px] w-full appearance-none border-0 bg-transparent [&::-webkit-meter-bar]:rounded-full [&::-webkit-meter-bar]:border-[length:var(--animal-border-width)] [&::-webkit-meter-bar]:border-[var(--animal-primary-color-bg)] [&::-webkit-meter-bar]:bg-[var(--animal-primary-color-bg)] [&::-webkit-meter-optimum-value]:rounded-full [&::-webkit-meter-optimum-value]:bg-[var(--animal-primary-color)] [&::-moz-meter-bar]:rounded-full [&::-moz-meter-bar]:bg-[var(--animal-primary-color)]"
                    aria-label={`${financeCategoryLabels[item.categoryId]}支出占比`}
                    min={0}
                    max={100}
                    value={Math.round(share * 100)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="m-0 grid min-h-[92px] place-items-center text-center text-[var(--animal-text-color-secondary)]">
            记录支出后，这里会按分类显示金额和占比。
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(420px,1.2fr)]">
        <div className="flex flex-col gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none">
            <Title color="app-yellow">记一笔</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_.animal-select]:w-full [&_.animal-date-picker]:w-full">
            <Form layout="vertical" onFinish={submitEntry}>
              <FormItem name="type" label="收支类型">
                <Radio
                  options={[
                    { label: "支出", value: "expense" },
                    { label: "收入", value: "income" },
                  ]}
                  value={type}
                  onChange={changeType}
                />
              </FormItem>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="amount" label="金额（元）">
                  <Input
                    inputMode="decimal"
                    placeholder="例如 28.50"
                    size="large"
                    shadow
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </FormItem>
                <FormItem name="categoryId" label="分类">
                  <Select
                    options={categoryOptions}
                    value={categoryId}
                    onChange={(value) => setCategoryId(value as FinanceCategory)}
                  />
                </FormItem>
              </div>
              <FormItem name="date" label="日期">
                <DatePicker
                  value={date}
                  onChange={(value) => typeof value === "string" && setDate(value)}
                  allowClear={false}
                />
              </FormItem>
              <FormItem name="note" label="备注">
                <Input
                  placeholder="这笔钱花在哪里？"
                  allowClear
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormItem>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                block
                loading={createEntry.isPending}
              >
                保存这笔记录
              </Button>
            </Form>
          </Card>

          <Card
            className="w-full p-[22px] sm:p-7 [&_h2]:m-0 [&_p]:text-[var(--animal-text-color-secondary)]"
            type="dashed"
          >
            <h2>本月预算</h2>
            <p>
              {summary?.budgetFen === null || summary?.budgetFen === undefined
                ? "还没有设置预算"
                : `当前预算 ${formatFen(summary.budgetFen)}`}
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                inputMode="decimal"
                placeholder="预算金额"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
              <Button htmlType="button" loading={setMonthlyBudget.isPending} onClick={submitBudget}>
                保存预算
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="flex min-h-12 items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none">
            <Title color="app-teal">账目明细</Title>
            <span className="mt-1 whitespace-nowrap rounded-full bg-[var(--animal-primary-color-bg)] px-[13px] py-2 text-xs font-extrabold leading-none text-[var(--animal-primary-color-active)] sm:text-[length:var(--animal-font-size-sm)]">
              {month} · {finance.data?.entries.length ?? 0} 笔
            </span>
          </div>
          <Card className="w-full p-[22px] sm:p-7">
            {finance.isPending ? (
              <p className="mx-0 mb-0 mt-[5px] px-3 py-12 text-center leading-relaxed text-[var(--animal-text-color-secondary)]">
                正在翻开账本…
              </p>
            ) : null}
            {finance.data?.entries.length === 0 ? (
              <p className="mx-0 mb-0 mt-[5px] px-3 py-12 text-center leading-relaxed text-[var(--animal-text-color-secondary)]">
                这个月还没有记录，从左边记下第一笔吧。
              </p>
            ) : null}
            <div className="grid">
              {finance.data?.entries.map((entry) => (
                <article
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3.5 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] px-1 py-[18px] last:border-b-0 sm:items-center sm:gap-6"
                  key={entry.id}
                >
                  <div className="min-w-0 [&_p]:mb-0 [&_p]:mt-[5px] [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)]">
                    <div className="flex items-baseline gap-2.5 [&>strong:last-child]:whitespace-nowrap [&>strong:last-child]:text-[length:var(--animal-font-size-lg)]">
                      <Tag
                        size="small"
                        variant="soft"
                        color={entry.type === "income" ? "app-green" : "app-teal"}
                      >
                        {financeCategoryLabels[entry.categoryId]}
                      </Tag>
                      <strong
                        className={
                          entry.type === "income"
                            ? "text-[var(--animal-success-color-active)]"
                            : "text-[var(--animal-error-color-active)]"
                        }
                      >
                        {entry.type === "income" ? "+" : "−"}
                        {formatFen(entry.amountFen)}
                      </strong>
                    </div>
                    <p>
                      {entry.date}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <DeleteRecordButton
                    source="finance"
                    id={entry.id}
                    label={entry.note || financeCategoryLabels[entry.categoryId]}
                    expectedUpdatedAt={entry.updatedAt}
                    appearance="button"
                  />
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
