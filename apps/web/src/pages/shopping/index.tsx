import type { ShoppingItem } from "@daily-life/shared";
import { Button, Card, Form, FormItem, Input, Select, Tag, Title } from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { useShopping, useShoppingMutations } from "@/data-provider/life";
import { notify } from "@/services/notification.service";

const categoryOptions = [
  { key: "food", label: "食品" },
  { key: "daily", label: "日用" },
  { key: "clothing", label: "服饰" },
  { key: "digital", label: "数码" },
  { key: "home", label: "家居" },
  { key: "gift", label: "礼物" },
  { key: "other", label: "其他" },
];
const categoryLabels = Object.fromEntries(categoryOptions.map((item) => [item.key, item.label]));
const priorityOptions = [
  { key: "casual", label: "随手记" },
  { key: "someday", label: "有空买" },
  { key: "soon", label: "近期买" },
  { key: "urgent", label: "急需" },
];
const filterOptions = [
  { key: "wanted", label: "待买" },
  { key: "all", label: "全部" },
  { key: "purchased", label: "已买" },
];
const moneyFormatter = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const month = today.slice(0, 7);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("件");
  const [categoryId, setCategoryId] = useState("daily");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState("someday");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("wanted");
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const shopping = useShopping(month);
  const mutations = useShoppingMutations(month);
  const clearEditor = () => {
    setEditing(null);
    setName("");
    setQuantity("1");
    setUnit("件");
    setCategoryId("daily");
    setPrice("");
    setPriority("someday");
    setNote("");
  };
  const visibleItems = useMemo(
    () => (shopping.data?.items ?? []).filter((item) => filter === "all" || item.status === filter),
    [filter, shopping.data],
  );

  const submit = () => {
    const parsedQuantity = Number(quantity);
    const priceFen = price.trim() ? Math.round(Number(price) * 100) : null;
    if (
      !name.trim() ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0 ||
      (priceFen !== null && (!Number.isFinite(priceFen) || priceFen < 0))
    ) {
      notify.error("请填写名称和正整数数量，价格可留空但不能为负数。");
      return;
    }
    const values = {
      name: name.trim(),
      quantity: parsedQuantity,
      unit: unit.trim() || null,
      categoryId: categoryId as
        | "food"
        | "daily"
        | "clothing"
        | "digital"
        | "home"
        | "gift"
        | "other",
      estimatedUnitPriceFen: priceFen,
      priority: priority as "casual" | "someday" | "soon" | "urgent",
      note: note.trim() || null,
    };
    if (editing) {
      mutations.update.mutate(
        { ...values, id: editing.id, expectedUpdatedAt: editing.updatedAt },
        {
          onSuccess: () => {
            clearEditor();
            notify.success("待买物品已更新。");
          },
        },
      );
    } else {
      mutations.create.mutate(
        { ...values, id: crypto.randomUUID() },
        {
          onSuccess: clearEditor,
        },
      );
    }
  };

  const beginEdit = (item: ShoppingItem) => {
    setEditing(item);
    setName(item.name);
    setQuantity(String(item.quantity));
    setUnit(item.unit ?? "");
    setCategoryId(item.categoryId);
    setPrice(item.estimatedUnitPriceFen === null ? "" : String(item.estimatedUnitPriceFen / 100));
    setPriority(item.priority);
    setNote(item.note ?? "");
  };

  return (
    <section className="grid gap-7">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          待买清单
        </p>
        <h1>先记下来，再从容决定</h1>
        <p>预计预算只统计仍在待买状态且填写了价格的物品。</p>
      </header>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>待买物品</p>
          <strong>{shopping.data?.summary.wantedCount ?? "—"}</strong>
        </Card>
        <Card
          color="app-yellow"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>预计预算</p>
          <strong>
            {shopping.data
              ? moneyFormatter.format(shopping.data.summary.estimatedBudgetFen / 100)
              : "—"}
          </strong>
        </Card>
        <Card
          color="warm-peach-pink"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-32 sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>本月买到</p>
          <strong>{shopping.data?.summary.purchasedThisMonth ?? "—"}</strong>
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/ip-animals-transparent/F2-raccoon-right.png"
            alt=""
            aria-hidden="true"
            width={1254}
            height={1254}
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(440px,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-yellow">{editing ? "编辑待买" : "加入待买"}</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full">
            <Form layout="vertical" onFinish={submit}>
              <FormItem name="name" label="物品名称">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="想买什么？"
                  allowClear
                />
              </FormItem>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="quantity" label="数量">
                  <Input
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </FormItem>
                <FormItem name="unit" label="单位">
                  <Input value={unit} onChange={(event) => setUnit(event.target.value)} />
                </FormItem>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="categoryId" label="分类">
                  <Select options={categoryOptions} value={categoryId} onChange={setCategoryId} />
                </FormItem>
                <FormItem name="price" label="预计单价（元）">
                  <Input
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                </FormItem>
              </div>
              <FormItem name="priority" label="优先级">
                <Select options={priorityOptions} value={priority} onChange={setPriority} />
              </FormItem>
              <FormItem name="note" label="备注">
                <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
              </FormItem>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={mutations.create.isPending || mutations.update.isPending}
              >
                {editing ? "保存物品修改" : "加入待买清单"}
              </Button>
              {editing ? (
                <Button htmlType="button" block onClick={clearEditor}>
                  取消编辑
                </Button>
              ) : null}
            </Form>
          </Card>
        </div>
        <div className="flex w-full flex-col items-start gap-[18px]">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-teal">清单</Title>
            <Select options={filterOptions} value={filter} onChange={setFilter} />
          </div>
          <Card className="w-full p-[22px] sm:p-7">
            {visibleItems.length === 0 ? (
              <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
                当前清单还是空的。
              </p>
            ) : null}
            <div className="grid">
              {visibleItems.map((item) => (
                <article
                  className={`grid grid-cols-1 items-start gap-3.5 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] px-1 py-[18px] [contain-intrinsic-size:88px] [content-visibility:auto] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 ${
                    item.status === "purchased" ? "[&>div:first-child]:opacity-[0.65]" : ""
                  }`}
                  key={item.id}
                >
                  <div className="min-w-0 [&_strong]:my-[5px] [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)]">
                    <Tag size="small" variant="soft" color="app-teal">
                      {categoryLabels[item.categoryId]}
                    </Tag>
                    <strong>{item.name}</strong>
                    <p>
                      {item.quantity}
                      {item.unit ?? "件"}
                      {item.estimatedUnitPriceFen !== null
                        ? ` · 预计 ${moneyFormatter.format(item.estimatedUnitPriceFen / 100)}/件`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() =>
                        mutations.status.mutate({
                          item,
                          status: item.status === "purchased" ? "wanted" : "purchased",
                          purchasedOn: item.status === "purchased" ? null : today,
                        })
                      }
                    >
                      {item.status === "purchased" ? "恢复待买" : "标记已买"}
                    </Button>
                    <Button type="default" size="small" onClick={() => beginEdit(item)}>
                      编辑
                    </Button>
                    <DeleteRecordButton
                      source="shopping"
                      id={item.id}
                      label={item.name}
                      expectedUpdatedAt={item.updatedAt}
                      appearance="button"
                    />
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
