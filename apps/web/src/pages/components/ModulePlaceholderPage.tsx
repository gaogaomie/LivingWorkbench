import { Button, Card } from "animal-island-ui";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  nextStep: string;
}

export function ModulePlaceholderPage({
  title,
  description,
  nextStep,
}: ModulePlaceholderPageProps) {
  return (
    <section className="grid gap-7">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          一期工作区
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <Card
        className="grid min-h-[360px] place-items-center content-center px-6 py-16 text-center [&>span]:text-[28px] [&>span]:tracking-[0.3em] [&>span]:text-[var(--animal-primary-color-hover)] [&_h2]:mb-1 [&_h2]:mt-3.5 [&_p]:mb-6 [&_p]:mt-0 [&_p]:max-w-[520px] [&_p]:text-[var(--animal-text-color-secondary)] [&_.animal-button]:min-h-11"
        type="dashed"
      >
        <span aria-hidden="true">· · ·</span>
        <h2>这里还没有记录</h2>
        <p>{nextStep}</p>
        <Button htmlType="button" disabled>
          功能建设中
        </Button>
      </Card>
    </section>
  );
}
