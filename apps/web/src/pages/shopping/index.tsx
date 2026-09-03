import {
  type ShoppingItem,
  shoppingCategoryLabels,
  shoppingPriorityLabels,
  shoppingStatusLabels,
} from "@daily-life/shared";
import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Select,
  Table,
  type TableColumn,
  Tag,
  Title,
} from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DonutChart } from "@/components/charts/StatisticsCharts";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { RecordEditorActions, RecordEditorDrawer } from "@/components/RecordEditorDrawer";
import { ShoppingItemCreateForm } from "@/components/record-editors/ShoppingItemCreateForm";
import { useShopping, useShoppingMutations } from "@/data-provider/life";
import { formatMoneyFen } from "@/presentation/domain-formatters";
import { notify } from "@/services/notification.service";
import { summarizeWantedBudget } from "./shopping-statistics";

const categoryOptions = Object.entries(shoppingCategoryLabels).map(([key, label]) => ({
  key,
  label,
}));
const priorityOptions = Object.entries(shoppingPriorityLabels).map(([key, label]) => ({
  key,
  label,
}));
const filterOptions = [
  { key: "wanted", label: shoppingStatusLabels.wanted },
  { key: "all", label: "全部" },
  { key: "purchased", label: shoppingStatusLabels.purchased },
];
const shoppingEditorFormId = "shopping-editor-form";
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
  const [editorOpen, setEditorOpen] = useState(false);
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
    setEditorOpen(false);
  };
  const openCreateEditor = () => {
    clearEditor();
    setEditorOpen(true);
  };
  const visibleItems = useMemo(
    () => (shopping.data?.items ?? []).filter((item) => filter === "all" || item.status === filter),
    [filter, shopping.data],
  );
  const wantedBudgetByCategory = useMemo(
    () => summarizeWantedBudget(shopping.data?.items ?? []),
    [shopping.data?.items],
  );
  const visibleItemsById = new Map(visibleItems.map((item) => [item.id, item]));
  const tableData: Record<string, unknown>[] = visibleItems.map((item) => ({
    ...item,
  }));
  const tableColumns: TableColumn[] = [
    {
      title: "分类",
      dataIndex: "categoryId",
      width: 110,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        return item ? (
          <Tag size="small" variant="soft" color="app-teal">
            {shoppingCategoryLabels[item.categoryId]}
          </Tag>
        ) : null;
      },
    },
    {
      title: "物品",
      dataIndex: "name",
      width: 240,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        if (!item) return null;
        return (
          <div className="grid gap-1">
            <strong>{item.name}</strong>
            {item.note ? (
              <span className="text-sm text-[var(--animal-text-color-secondary)]">{item.note}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "数量",
      dataIndex: "quantity",
      width: 110,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        return item ? `${item.quantity}${item.unit ?? "件"}` : "—";
      },
    },
    {
      title: "预计单价",
      dataIndex: "estimatedUnitPriceFen",
      width: 140,
      render: (value) => (typeof value === "number" ? formatMoneyFen(value) : "—"),
    },
    {
      title: "优先级",
      dataIndex: "priority",
      width: 140,
      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        return item ? shoppingPriorityLabels[item.priority] : "—";
      },
    },
    {
      title: "操作",

      align: "right",
      fixed: "right",

      render: (_value, record) => {
        const item = typeof record.id === "string" ? visibleItemsById.get(record.id) : undefined;
        if (!item) return null;
        return (
          <div className="flex flex-nowrap items-center justify-end gap-2.5">
            <Button
              type="dashed"
              size="small"
              aria-label={`${item.status === "purchased" ? "恢复待买" : "标记已买"}“${item.name}”`}
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
            <Button
              type="default"
              size="small"
              aria-label={`编辑“${item.name}”`}
              onClick={() => beginEdit(item)}
            >
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
        );
      },
    },
  ];

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
    if (!editing) return;
    mutations.update.mutate(
      { ...values, id: editing.id, expectedUpdatedAt: editing.updatedAt },
      {
        onSuccess: () => {
          clearEditor();
          notify.success("待买物品已更新。");
        },
      },
    );
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
    setEditorOpen(true);
  };

  return (
    <section className="grid gap-7">
      <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            待买清单
          </p>
          <h1>先记下来，再从容决定</h1>
          <p>预计预算只统计仍在待买状态且填写了价格的物品。</p>
        </div>
        <Button type="primary" size="large" onClick={openCreateEditor}>
          加入待买
        </Button>
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
            {shopping.data ? formatMoneyFen(shopping.data.summary.estimatedBudgetFen) : "—"}
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
      <Card className="px-[22px] py-[26px] sm:px-7">
        <div className="mb-[22px] flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end [&_h2]:mb-0 [&_h2]:mt-1 [&>p]:m-0 [&>p]:text-[var(--animal-text-color-secondary)]">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
              预算洞察
            </p>
            <h2>待买预算分类</h2>
          </div>
          <p>只统计待买且已填写预计价格的物品。</p>
        </div>
        {wantedBudgetByCategory.length ? (
          <DonutChart
            ariaLabel="待买预算分类占比"
            centerLabel="预计预算"
            centerValue={formatMoneyFen(shopping.data?.summary.estimatedBudgetFen ?? 0)}
            data={wantedBudgetByCategory.map((item) => ({
              name: shoppingCategoryLabels[item.categoryId],
              value: item.amountFen,
              valueLabel: formatMoneyFen(item.amountFen),
            }))}
          />
        ) : (
          <p className="m-0 grid min-h-[92px] place-items-center text-center text-[var(--animal-text-color-secondary)]">
            为待买物品填写预计价格后，这里会显示预算流向。
          </p>
        )}
      </Card>
      <div className="flex w-full flex-col items-start gap-[18px]">
        <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
          <Title color="app-teal">清单</Title>
          <Select
            aria-label="筛选待买清单"
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <Card className="w-full overflow-hidden p-3 sm:p-5">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            rowKey="id"
            loading={shopping.isPending}
            scroll={{ x: 980 }}
            emptyText={
              <div className="grid min-h-[160px] place-items-center gap-4 px-6 py-10 text-center text-[var(--animal-text-color-secondary)]">
                <p className="m-0">当前清单还是空的。</p>
                <Button type="primary" onClick={openCreateEditor}>
                  添加第一件物品
                </Button>
              </div>
            }
          />
        </Card>
      </div>

      <RecordEditorDrawer
        open={editorOpen}
        title={editing ? "编辑待买" : "加入待买"}
        onClose={clearEditor}
        protectUnsavedChanges
        footer={
          editing ? (
            <RecordEditorActions
              formId={shoppingEditorFormId}
              saveLabel="保存物品修改"
              isSaving={mutations.update.isPending}
              onCancel={clearEditor}
            />
          ) : undefined
        }
        wide
      >
        {editing ? (
          <Form
            key={editing.id}
            id={shoppingEditorFormId}
            initialValues={{
              name: editing.name,
              quantity: String(editing.quantity),
              unit: editing.unit ?? "",
              categoryId: editing.categoryId,
              price:
                editing.estimatedUnitPriceFen === null
                  ? ""
                  : String(editing.estimatedUnitPriceFen / 100),
              priority: editing.priority,
              note: editing.note ?? "",
            }}
            layout="vertical"
            onFinish={submit}
          >
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
                <div className="w-fit max-w-full">
                  <Select
                    aria-label="分类"
                    options={categoryOptions}
                    value={categoryId}
                    onChange={setCategoryId}
                  />
                </div>
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
              <div className="w-fit max-w-full">
                <Select
                  aria-label="优先级"
                  options={priorityOptions}
                  value={priority}
                  onChange={setPriority}
                />
              </div>
            </FormItem>
            <FormItem name="note" label="备注">
              <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
            </FormItem>
          </Form>
        ) : editorOpen ? (
          <ShoppingItemCreateForm
            isSubmitting={mutations.create.isPending}
            onSubmit={(input) => mutations.create.mutate(input, { onSuccess: clearEditor })}
          />
        ) : null}
      </RecordEditorDrawer>
    </section>
  );
}
