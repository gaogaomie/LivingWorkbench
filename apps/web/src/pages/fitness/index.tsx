import type { FitnessResponse } from "@daily-life/shared";
import { Button, Card, DatePicker, Form, FormItem, Input, Title } from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { useFitness, useFitnessMutations } from "@/data-provider/life";
import { notify } from "@/services/notification.service";

function nullableNumber(value: string): number | null {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) ? number : null;
}

function kgToGram(value: string): number | null {
  const number = nullableNumber(value);
  return number === null ? null : Math.round(number * 1000);
}

export function Component() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [calories, setCalories] = useState("");
  const [exercise, setExercise] = useState("");
  const [steps, setSteps] = useState("");
  const [note, setNote] = useState("");
  const [height, setHeight] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<FitnessResponse["logs"][number] | null>(null);
  const fitness = useFitness(today);
  const mutations = useFitnessMutations(today);
  const clearLogEditor = () => {
    setEditing(null);
    setDate(today);
    setWeight("");
    setBodyFat("");
    setCalories("");
    setExercise("");
    setSteps("");
    setNote("");
  };

  const saveLog = () => {
    const input = {
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
    if (editing) {
      mutations.updateLog.mutate(
        { ...input, id: editing.id, expectedUpdatedAt: editing.updatedAt },
        {
          onSuccess: () => {
            clearLogEditor();
            notify.success("健身记录已更新。");
          },
        },
      );
    } else {
      mutations.saveLog.mutate(
        { ...input, id: crypto.randomUUID() },
        {
          onSuccess: clearLogEditor,
        },
      );
    }
  };

  const beginEdit = (log: FitnessResponse["logs"][number]) => {
    setEditing(log);
    setDate(log.date);
    setWeight(log.weightGram === null ? "" : String(log.weightGram / 1000));
    setBodyFat(log.bodyFatBasisPoints === null ? "" : String(log.bodyFatBasisPoints / 100));
    setCalories(log.calorieIntakeKcal === null ? "" : String(log.calorieIntakeKcal));
    setExercise(log.exerciseMinutes === null ? "" : String(log.exerciseMinutes));
    setSteps(log.steps === null ? "" : String(log.steps));
    setNote(log.note ?? "");
  };

  const saveProfile = () => {
    mutations.saveProfile.mutate({
      heightCm: nullableNumber(height),
      birthYear: null,
      sexForFormula: null,
      startWeightGram: kgToGram(startWeight),
      targetWeightGram: kgToGram(targetWeight),
      targetDate,
    });
  };

  const summary = fitness.data?.summary;
  const weightTrend = useMemo(
    () =>
      (fitness.data?.logs ?? [])
        .filter((log) => log.weightGram !== null)
        .slice(0, 14)
        .reverse(),
    [fitness.data?.logs],
  );
  const weights = weightTrend.map((log) => log.weightGram as number);
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const weightRange = maxWeight - minWeight;
  return (
    <section className="grid gap-7">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          减脂健身
        </p>
        <h1>看趋势，不审判一天</h1>
        <p>体重、体脂和运动数据只用于个人趋势展示，不构成医疗建议。</p>
      </header>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>当前体重</p>
          <strong>
            {summary?.currentWeightGram
              ? `${(summary.currentWeightGram / 1000).toFixed(1)} kg`
              : "—"}
          </strong>
        </Card>
        <Card
          color="app-yellow"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>当前 BMI</p>
          <strong>{summary?.bmi ?? "—"}</strong>
        </Card>
        <Card
          color="warm-peach-pink"
          className="relative min-h-[136px] overflow-visible p-6 pr-[118px] sm:min-h-32 sm:pr-[clamp(104px,8vw,128px)] [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>7 日均重</p>
          <strong>
            {summary?.averageWeight7Gram
              ? `${(summary.averageWeight7Gram / 1000).toFixed(1)} kg`
              : "多记录几天"}
          </strong>
          <img
            className="pointer-events-none absolute bottom-0 right-3 h-auto max-h-[calc(100%+24px)] w-[100px] select-none object-contain object-right-bottom sm:right-2 sm:w-[clamp(88px,7vw,112px)]"
            src="/brand/module-ip-transparent/L2-schedule-bee-right.png"
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
              趋势洞察
            </p>
            <h2>最近 14 次体重</h2>
          </div>
          <p>纵向变化按当前记录区间放大，仅用于观察趋势。</p>
        </div>
        {weightTrend.length ? (
          <div className="min-w-0 max-w-full overflow-x-auto px-0.5 pb-2 pt-0.5">
            <ol
              className="m-0 grid min-h-[220px] min-w-[640px] list-none grid-cols-[repeat(14,minmax(34px,1fr))] items-end gap-2.5 p-0"
              aria-label="最近 14 次体重趋势"
            >
              {weightTrend.map((log) => {
                const value = log.weightGram as number;
                const height = weightRange ? 28 + ((value - minWeight) / weightRange) * 72 : 64;
                return (
                  <li
                    className="grid min-w-0 grid-rows-[auto_150px_auto] gap-2 text-center [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[length:var(--animal-font-size-sm)] [&_strong]:text-[var(--animal-primary-color-active)] [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[var(--animal-text-color-secondary)]"
                    key={log.id}
                  >
                    <strong>{(value / 1000).toFixed(1)}</strong>
                    <div
                      className="flex h-[150px] items-end justify-center border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] [&>span]:min-h-[18px] [&>span]:w-[min(30px,72%)] [&>span]:rounded-[var(--animal-border-radius-base)_var(--animal-border-radius-base)_6px_6px] [&>span]:border-[length:var(--animal-border-width)] [&>span]:border-[var(--animal-primary-color-active)] [&>span]:bg-[var(--animal-primary-color)]"
                      aria-hidden="true"
                    >
                      <span style={{ height: `${height}%` }} />
                    </div>
                    <small>{log.date.slice(5)}</small>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="m-0 grid min-h-[92px] place-items-center text-center text-[var(--animal-text-color-secondary)]">
            记录体重后，这里会按时间显示最近 14 次变化。
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(440px,1.2fr)]">
        <div className="flex flex-col items-start gap-[18px] lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-yellow">{editing ? "编辑健身记录" : "记录今天"}</Title>
          </div>
          <Card className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full">
            <Form layout="vertical" onFinish={saveLog}>
              <FormItem name="date" label="日期">
                <DatePicker
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
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={mutations.saveLog.isPending || mutations.updateLog.isPending}
              >
                {editing ? "保存记录修改" : "保存今日记录"}
              </Button>
              {editing ? (
                <Button htmlType="button" block onClick={clearLogEditor}>
                  取消编辑
                </Button>
              ) : null}
            </Form>
          </Card>

          <Card
            className="w-full p-[22px] sm:p-7 [&_h2]:mt-0 [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full [&_.animal-select]:w-full"
            type="dashed"
          >
            <h2>目标设置</h2>
            <Form layout="vertical" onFinish={saveProfile}>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="height" label="身高（cm）">
                  <Input
                    inputMode="numeric"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    placeholder={fitness.data?.profile?.heightCm?.toString()}
                  />
                </FormItem>
                <FormItem name="startWeight" label="起始体重（kg）">
                  <Input
                    inputMode="decimal"
                    value={startWeight}
                    onChange={(event) => setStartWeight(event.target.value)}
                  />
                </FormItem>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <FormItem name="targetWeight" label="目标体重（kg）">
                  <Input
                    inputMode="decimal"
                    value={targetWeight}
                    onChange={(event) => setTargetWeight(event.target.value)}
                  />
                </FormItem>
                <FormItem name="targetDate" label="目标日期">
                  <DatePicker
                    value={targetDate}
                    onChange={(value) => setTargetDate(typeof value === "string" ? value : null)}
                    allowClear
                  />
                </FormItem>
              </div>
              <Button htmlType="submit" block loading={mutations.saveProfile.isPending}>
                保存目标
              </Button>
            </Form>
          </Card>
        </div>

        <div className="flex w-full flex-col items-start gap-[18px]">
          <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none [&_.animal-select]:mt-1 [&_.animal-select]:w-[min(200px,52%)] sm:[&_.animal-select]:w-[min(220px,48%)]">
            <Title color="app-teal">身体趋势样本</Title>
            <span className="mt-1 whitespace-nowrap rounded-full bg-[var(--animal-primary-color-bg)] px-[13px] py-2 text-xs font-extrabold leading-none text-[var(--animal-primary-color-active)] sm:text-[length:var(--animal-font-size-sm)]">
              最近记录 · {fitness.data?.logs.length ?? 0} 天
            </span>
          </div>
          <Card className="w-full p-[22px] sm:p-7">
            {fitness.data?.logs.length === 0 ? (
              <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
                还没有记录，先留下今天的一项数据吧。
              </p>
            ) : null}
            <div className="grid">
              {fitness.data?.logs.map((log) => (
                <article
                  className="grid grid-cols-1 items-start gap-3.5 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] px-1 py-[18px] [contain-intrinsic-size:88px] [content-visibility:auto] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                  key={log.id}
                >
                  <div className="min-w-0 [&_strong]:my-[5px] [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-[var(--animal-text-color-secondary)]">
                    <strong>{log.date}</strong>
                    <p>
                      {[
                        log.weightGram ? `${(log.weightGram / 1000).toFixed(1)} kg` : null,
                        log.exerciseMinutes ? `运动 ${log.exerciseMinutes} 分钟` : null,
                        log.steps ? `${log.steps} 步` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || log.note}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <Button type="dashed" size="small" onClick={() => beginEdit(log)}>
                      编辑
                    </Button>
                    <DeleteRecordButton
                      source="fitness"
                      id={log.id}
                      label={`${log.date} 健身记录`}
                      expectedUpdatedAt={log.updatedAt}
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
