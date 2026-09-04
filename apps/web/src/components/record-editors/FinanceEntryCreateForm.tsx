import {
  type CreateFinanceEntry,
  type FinanceCategory,
  type FinanceEntry,
  type FinanceEntryType,
  financeCategoriesByType,
  financeCategoryLabels,
  type UpdateFinanceEntry,
} from "@daily-life/shared";
import { Button, DatePicker, Form, FormItem, Input, Radio, Select } from "animal-island-ui";
import { useMemo, useState } from "react";
import { notify } from "@/services/notification.service";

interface FinanceEntryCreateFormProps {
  defaultDate: string;
  isSubmitting: boolean;
  onSubmit: (input: CreateFinanceEntry) => void;
}

interface FinanceEntryEditFormProps {
  entry: FinanceEntry;
  formId: string;
  isSubmitting: boolean;
  onSubmit: (input: UpdateFinanceEntry) => void;
}

interface FinanceEntryFields {
  type: FinanceEntryType;
  amountFen: number;
  categoryId: FinanceCategory;
  date: string;
  note: string | null;
}

interface FinanceEntryFormProps {
  initialValues: {
    type: FinanceEntryType;
    amount: string;
    categoryId: FinanceCategory;
    date: string;
    note: string;
  };
  formId?: string;
  isSubmitting: boolean;
  showSubmitButton?: boolean;
  submitLabel: string;
  onSubmit: (fields: FinanceEntryFields) => void;
}

function isFinanceEntryType(value: string | number): value is FinanceEntryType {
  return value === "expense" || value === "income";
}

function parseAmountFen(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amountFen = Math.round(Number(normalized) * 100);
  return amountFen > 0 ? amountFen : null;
}

function FinanceEntryForm({
  initialValues,
  formId,
  isSubmitting,
  showSubmitButton = true,
  submitLabel,
  onSubmit,
}: FinanceEntryFormProps) {
  const [type, setType] = useState<FinanceEntryType>(initialValues.type);
  const [amount, setAmount] = useState(initialValues.amount);
  const [categoryId, setCategoryId] = useState<FinanceCategory>(initialValues.categoryId);
  const [date, setDate] = useState(initialValues.date);
  const [note, setNote] = useState(initialValues.note);
  const categoryOptions = useMemo(
    () =>
      financeCategoriesByType[type].map((key) => ({
        key,
        label: financeCategoryLabels[key],
      })),
    [type],
  );

  const changeType = (value: string | number) => {
    if (!isFinanceEntryType(value)) return;
    setType(value);
    setCategoryId(financeCategoriesByType[value][0]);
  };

  const changeCategory = (value: string) => {
    const category = financeCategoriesByType[type].find((item) => item === value);
    if (category) setCategoryId(category);
  };

  const submit = () => {
    const amountFen = parseAmountFen(amount);
    if (amountFen === null || !date) {
      notify.error("请输入正确的金额和日期，金额最多保留两位小数。");
      return;
    }
    onSubmit({
      type,
      amountFen,
      categoryId,
      date,
      note: note.trim() || null,
    });
  };

  return (
    <Form id={formId} layout="vertical" onFinish={submit}>
      <FormItem label="收支类型">
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
        <FormItem label="金额（元）">
          <Input
            aria-label="金额（元）"
            inputMode="decimal"
            placeholder="例如 28.50"
            size="large"
            shadow
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormItem>
        <FormItem label="分类">
          <Select
            aria-label="分类"
            options={categoryOptions}
            value={categoryId}
            onChange={changeCategory}
          />
        </FormItem>
      </div>
      <FormItem label="日期">
        <DatePicker
          aria-label="日期"
          value={date}
          onChange={(value) => typeof value === "string" && setDate(value)}
          allowClear={false}
        />
      </FormItem>
      <FormItem label="备注">
        <Input
          aria-label="备注"
          placeholder="这笔钱花在哪里？"
          allowClear
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormItem>
      {showSubmitButton ? (
        <Button type="primary" size="large" htmlType="submit" block loading={isSubmitting}>
          {submitLabel}
        </Button>
      ) : null}
    </Form>
  );
}

export function FinanceEntryCreateForm({
  defaultDate,
  isSubmitting,
  onSubmit,
}: FinanceEntryCreateFormProps) {
  return (
    <FinanceEntryForm
      initialValues={{
        type: "expense",
        amount: "",
        categoryId: "food",
        date: defaultDate,
        note: "",
      }}
      isSubmitting={isSubmitting}
      submitLabel="保存这笔记录"
      onSubmit={(fields) => onSubmit({ id: crypto.randomUUID(), ...fields })}
    />
  );
}

export function FinanceEntryEditForm({
  entry,
  formId,
  isSubmitting,
  onSubmit,
}: FinanceEntryEditFormProps) {
  return (
    <FinanceEntryForm
      key={`${entry.id}:${entry.updatedAt}`}
      formId={formId}
      initialValues={{
        type: entry.type,
        amount: (entry.amountFen / 100).toFixed(2),
        categoryId: entry.categoryId,
        date: entry.date,
        note: entry.note ?? "",
      }}
      isSubmitting={isSubmitting}
      showSubmitButton={false}
      submitLabel="保存账目修改"
      onSubmit={(fields) => onSubmit({ ...fields, expectedUpdatedAt: entry.updatedAt })}
    />
  );
}
