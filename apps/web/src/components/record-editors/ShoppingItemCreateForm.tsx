import {
  type CreateShoppingItem,
  shoppingCategoryLabels,
  shoppingPriorityLabels,
} from "@daily-life/shared";
import { Button, Form, FormItem, Input, Select } from "animal-island-ui";
import { useState } from "react";
import { notify } from "@/services/notification.service";

const categoryOptions = Object.entries(shoppingCategoryLabels).map(([key, label]) => ({
  key,
  label,
}));
const priorityOptions = Object.entries(shoppingPriorityLabels).map(([key, label]) => ({
  key,
  label,
}));

interface ShoppingItemCreateFormProps {
  isSubmitting: boolean;
  onSubmit: (input: CreateShoppingItem) => void;
}

type ShoppingCategory = CreateShoppingItem["categoryId"];
type ShoppingPriority = CreateShoppingItem["priority"];

function isShoppingCategory(value: string): value is ShoppingCategory {
  return categoryOptions.some((option) => option.key === value);
}

function isShoppingPriority(value: string): value is ShoppingPriority {
  return priorityOptions.some((option) => option.key === value);
}

export function ShoppingItemCreateForm({ isSubmitting, onSubmit }: ShoppingItemCreateFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("件");
  const [categoryId, setCategoryId] = useState<ShoppingCategory>("daily");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState<ShoppingPriority>("someday");
  const [note, setNote] = useState("");

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
    onSubmit({
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: parsedQuantity,
      unit: unit.trim() || null,
      categoryId,
      estimatedUnitPriceFen: priceFen,
      priority,
      note: note.trim() || null,
    });
  };

  return (
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
          <div className="w-fit max-w-full">
            <Select
              aria-label="分类"
              options={[...categoryOptions]}
              value={categoryId}
              onChange={(value) => isShoppingCategory(value) && setCategoryId(value)}
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
            options={[...priorityOptions]}
            value={priority}
            onChange={(value) => isShoppingPriority(value) && setPriority(value)}
          />
        </div>
      </FormItem>
      <FormItem name="note" label="备注">
        <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
      </FormItem>
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        加入待买清单
      </Button>
    </Form>
  );
}
