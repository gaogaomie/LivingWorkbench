import { Button } from "animal-island-ui";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "页面暂时无法打开。";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--animal-bg-color)] p-6">
      <section className="w-[min(520px,100%)] rounded-[var(--animal-border-radius-lg)] bg-[var(--animal-surface-color)] p-10 text-center shadow-island [&_h1]:mt-0 [&_p]:mb-0 [&_p]:text-[var(--animal-text-color-secondary)]">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          遇到一点问题
        </p>
        <h1>{message}</h1>
        <p>可以回到今日总览继续使用，稍后再试一次。</p>
        <Button type="primary" size="large" onClick={() => navigate("/")}>
          回到今日总览
        </Button>
      </section>
    </main>
  );
}
