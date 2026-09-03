import type { FitnessResponse } from "@daily-life/shared";
import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Modal,
  Table,
  type TableColumn,
  Title,
} from "animal-island-ui";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { LineTrendChart } from "@/components/charts/StatisticsCharts";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { RecordEditorActions, RecordEditorDrawer } from "@/components/RecordEditorDrawer";
import { FitnessLogCreateForm } from "@/components/record-editors/FitnessLogCreateForm";
import { useFitness, useFitnessMutations } from "@/data-provider/life";
import {
  formatInteger,
  formatLocalDate,
  formatMonthDay,
  formatWeightGram,
} from "@/presentation/domain-formatters";
import { notify } from "@/services/notification.service";

function nullableNumber(value: string): number | null {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) ? number : null;
}

function kgToGram(value: string): number | null {
  const number = nullableNumber(value);
  return number === null ? null : Math.round(number * 1000);
}

const fitnessEditorFormId = "fitness-editor-form";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [goalSettingsOpen, setGoalSettingsOpen] = useState(false);
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
    setEditorOpen(false);
  };
  const openCreateEditor = () => {
    clearLogEditor();
    setEditorOpen(true);
  };

  const openGoalSettings = () => {
    const profile = fitness.data?.profile;
    setHeight(
      profile?.heightCm === null || profile?.heightCm === undefined ? "" : String(profile.heightCm),
    );
    setStartWeight(
      profile?.startWeightGram === null || profile?.startWeightGram === undefined
        ? ""
        : String(profile.startWeightGram / 1000),
    );
    setTargetWeight(
      profile?.targetWeightGram === null || profile?.targetWeightGram === undefined
        ? ""
        : String(profile.targetWeightGram / 1000),
    );
    setTargetDate(profile?.targetDate ?? null);
    setGoalSettingsOpen(true);
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
    if (!editing) return;
    mutations.updateLog.mutate(
      { ...input, id: editing.id, expectedUpdatedAt: editing.updatedAt },
      {
        onSuccess: () => {
          clearLogEditor();
          notify.success("健身记录已更新。");
        },
      },
    );
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
    setEditorOpen(true);
  };

  const saveProfile = () => {
    mutations.saveProfile.mutate(
      {
        heightCm: nullableNumber(height),
        birthYear: null,
        sexForFormula: null,
        startWeightGram: kgToGram(startWeight),
        targetWeightGram: kgToGram(targetWeight),
        targetDate,
      },
      {
        onSuccess: () => {
          setGoalSettingsOpen(false);
          notify.success("目标设置已保存。");
        },
      },
    );
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
  const logs = fitness.data?.logs ?? [];
  const logsById = new Map(logs.map((log) => [log.id, log]));
  const tableData: Record<string, unknown>[] = logs.map((log) => ({ ...log }));
  const tableColumns: TableColumn[] = [
    {
      title: "日期",
      dataIndex: "date",
      width: 150,
      fixed: "left",
      render: (value) => (typeof value === "string" ? formatLocalDate(value) : "—"),
    },
    {
      title: "体重",
      dataIndex: "weightGram",
      width: 120,
      render: (value) => (typeof value === "number" ? formatWeightGram(value) : "—"),
    },
    {
      title: "体脂率",
      dataIndex: "bodyFatBasisPoints",
      width: 110,
      render: (value) => (typeof value === "number" ? `${value / 100}%` : "—"),
    },
    {
      title: "摄入",
      dataIndex: "calorieIntakeKcal",
      width: 120,
      render: (value) => (typeof value === "number" ? `${formatInteger(value)} kcal` : "—"),
    },
    {
      title: "运动",
      dataIndex: "exerciseMinutes",
      width: 120,
      render: (value) => (typeof value === "number" ? `${formatInteger(value)} 分钟` : "—"),
    },
    {
      title: "步数",
      dataIndex: "steps",
      width: 120,
      render: (value) => (typeof value === "number" ? formatInteger(value) : "—"),
    },
    {
      title: "备注",
      dataIndex: "note",
      width: 280,
      render: (value) => (typeof value === "string" && value.trim() ? value : "—"),
    },
    {
      title: "操作",
      align: "right",
      fixed: "right",
      render: (_value, record) => {
        const log = typeof record.id === "string" ? logsById.get(record.id) : undefined;
        if (!log) return null;
        return (
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="dashed"
              size="small"
              aria-label={`编辑${formatLocalDate(log.date)}健身记录`}
              onClick={() => beginEdit(log)}
            >
              编辑
            </Button>
            <DeleteRecordButton
              source="fitness"
              id={log.id}
              label={`${formatLocalDate(log.date)}健身记录`}
              expectedUpdatedAt={log.updatedAt}
              appearance="button"
            />
          </div>
        );
      },
    },
  ];
  return (
    <section className="grid min-w-0 gap-7 [&>*]:min-w-0">
      <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end [&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&_p]:m-0 [&_p]:max-w-[680px] [&_p]:text-island-muted">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            减脂健身
          </p>
          <h1>看趋势，不审判一天</h1>
          <p>体重、体脂和运动数据只用于个人趋势展示，不构成医疗建议。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="large" onClick={openGoalSettings}>
            目标设置
          </Button>
          <Button type="primary" size="large" onClick={openCreateEditor}>
            记录今天
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <Card
          color="app-teal"
          className="min-h-32 p-6 [&_p]:mb-2.5 [&_p]:mt-0 [&_p]:font-bold [&_strong]:block [&_strong]:[overflow-wrap:anywhere] [&_strong]:text-[clamp(25px,3vw,36px)] [&_strong]:leading-[1.2]"
        >
          <p>当前体重</p>
          <strong>
            {summary?.currentWeightGram ? formatWeightGram(summary.currentWeightGram) : "—"}
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
              ? formatWeightGram(summary.averageWeight7Gram)
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
          <LineTrendChart
            ariaLabel="最近 14 次体重趋势"
            unit="kg"
            points={weightTrend.map((log) => ({
              id: log.id,
              label: formatMonthDay(log.date),
              value: (log.weightGram ?? 0) / 1000,
              valueLabel: formatWeightGram(log.weightGram ?? 0),
            }))}
          />
        ) : (
          <p className="m-0 grid min-h-[92px] place-items-center text-center text-[var(--animal-text-color-secondary)]">
            记录体重后，这里会按时间显示最近 14 次变化。
          </p>
        )}
      </Card>

      <div className="flex w-full flex-col items-start gap-[18px]">
        <div className="flex min-h-12 w-full items-start justify-between gap-3 sm:min-h-[54px] sm:gap-[18px] [&>:first-child]:flex-none">
          <Title color="app-teal">身体趋势样本</Title>
          <span className="mt-1 whitespace-nowrap rounded-full bg-[var(--animal-primary-color-bg)] px-[13px] py-2 text-xs font-extrabold leading-none text-[var(--animal-primary-color-active)] sm:text-[length:var(--animal-font-size-sm)]">
            最近记录 · {logs.length} 天
          </span>
        </div>
        <Card className="w-full overflow-hidden p-3 sm:p-5">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            rowKey="id"
            loading={fitness.isPending}
            scroll={{ x: 1_070 }}
            emptyText={
              <div className="grid min-h-[160px] place-items-center gap-4 px-6 py-10 text-center text-[var(--animal-text-color-secondary)]">
                <p className="m-0">还没有记录。</p>
                <Button type="primary" onClick={openCreateEditor}>
                  留下今天的数据
                </Button>
              </div>
            }
          />
        </Card>
      </div>

      <Modal
        open={goalSettingsOpen}
        title="目标设置"
        width={680}
        footer={null}
        typewriter={false}
        onClose={() => setGoalSettingsOpen(false)}
      >
        <Form layout="vertical" onFinish={saveProfile}>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <FormItem name="height" label="身高（cm）">
              <Input
                inputMode="numeric"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
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
                aria-label="目标日期"
                value={targetDate}
                onChange={(value) => setTargetDate(typeof value === "string" ? value : null)}
                allowClear
              />
            </FormItem>
          </div>
          <Button type="primary" htmlType="submit" block loading={mutations.saveProfile.isPending}>
            保存目标
          </Button>
        </Form>
      </Modal>

      <RecordEditorDrawer
        open={editorOpen}
        title={editing ? "编辑健身记录" : "记录今天"}
        onClose={clearLogEditor}
        protectUnsavedChanges
        footer={
          editing ? (
            <RecordEditorActions
              formId={fitnessEditorFormId}
              saveLabel="保存记录修改"
              isSaving={mutations.updateLog.isPending}
              onCancel={clearLogEditor}
            />
          ) : undefined
        }
        wide
      >
        {editing ? (
          <Form
            key={editing.id}
            id={fitnessEditorFormId}
            initialValues={{
              date: editing.date,
              weight: editing.weightGram === null ? "" : String(editing.weightGram / 1000),
              bodyFat:
                editing.bodyFatBasisPoints === null ? "" : String(editing.bodyFatBasisPoints / 100),
              calories: editing.calorieIntakeKcal === null ? "" : String(editing.calorieIntakeKcal),
              exercise: editing.exerciseMinutes === null ? "" : String(editing.exerciseMinutes),
              steps: editing.steps === null ? "" : String(editing.steps),
              note: editing.note ?? "",
            }}
            layout="vertical"
            onFinish={saveLog}
          >
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
          </Form>
        ) : editorOpen ? (
          <FitnessLogCreateForm
            defaultDate={today}
            isSubmitting={mutations.saveLog.isPending}
            onSubmit={(input) => mutations.saveLog.mutate(input, { onSuccess: clearLogEditor })}
          />
        ) : null}
      </RecordEditorDrawer>
    </section>
  );
}
