import type { FitnessLogInput } from "@daily-life/shared";
import { Button, DatePicker, Form, FormItem, Input } from "animal-island-ui";
import { useState } from "react";
import { notify } from "@/services/notification.service";

interface FitnessLogCreateFormProps {
  defaultDate: string;
  isSubmitting: boolean;
  onSubmit: (input: FitnessLogInput) => void;
}

function nullableNumber(value: string): number | null {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) ? number : null;
}

function kgToGram(value: string): number | null {
  const number = nullableNumber(value);
  return number === null ? null : Math.round(number * 1000);
}

export function FitnessLogCreateForm({
  defaultDate,
  isSubmitting,
  onSubmit,
}: FitnessLogCreateFormProps) {
  const [date, setDate] = useState(defaultDate);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [calories, setCalories] = useState("");
  const [exercise, setExercise] = useState("");
  const [steps, setSteps] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const input: FitnessLogInput = {
      id: crypto.randomUUID(),
      date,
      weightGram: kgToGram(weight),
      bodyFatBasisPoints: bodyFat ? Math.round(Number(bodyFat) * 100) : null,
      calorieIntakeKcal: nullableNumber(calories),
      exerciseMinutes: nullableNumber(exercise),
      steps: nullableNumber(steps),
      note: note.trim() || null,
    };
    if (
      input.weightGram === null &&
      input.bodyFatBasisPoints === null &&
      input.calorieIntakeKcal === null &&
      input.exerciseMinutes === null &&
      input.steps === null &&
      !input.note
    ) {
      notify.error("至少填写一项身体或运动记录。");
      return;
    }
    onSubmit(input);
  };

  return (
    <Form layout="vertical" onFinish={submit}>
      <FormItem name="date" label="日期">
        <DatePicker
          aria-label="日期"
          value={date}
          onChange={(value) => typeof value === "string" && setDate(value)}
        />
      </FormItem>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormItem name="weight" label="体重（kg）">
          <Input
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="例如 65.5"
          />
        </FormItem>
        <FormItem name="bodyFat" label="体脂率（%）">
          <Input
            inputMode="decimal"
            value={bodyFat}
            onChange={(event) => setBodyFat(event.target.value)}
          />
        </FormItem>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormItem name="calories" label="摄入（kcal）">
          <Input
            inputMode="numeric"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
          />
        </FormItem>
        <FormItem name="exercise" label="运动（分钟）">
          <Input
            inputMode="numeric"
            value={exercise}
            onChange={(event) => setExercise(event.target.value)}
          />
        </FormItem>
      </div>
      <FormItem name="steps" label="步数">
        <Input
          inputMode="numeric"
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
        />
      </FormItem>
      <FormItem name="note" label="备注">
        <Input value={note} onChange={(event) => setNote(event.target.value)} allowClear />
      </FormItem>
      <Button type="primary" htmlType="submit" block loading={isSubmitting}>
        保存今日记录
      </Button>
    </Form>
  );
}
