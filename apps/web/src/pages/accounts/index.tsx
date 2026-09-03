import { createMemberAccountRequestSchema } from "@daily-life/shared";
import { Button, Card, Title } from "animal-island-ui";
import { type FormEvent, useRef, useState } from "react";
import { useAdminAccounts, useCreateMemberAccount } from "@/data-provider/admin-accounts";
import { useAuthSession } from "@/data-provider/queries/use-auth-session";
import { formatIsoDateTime } from "@/presentation/domain-formatters";
import { notify } from "@/services/notification.service";

export function Component() {
  const session = useAuthSession();
  const isAdmin = session.data?.user.role === "admin";
  const accounts = useAdminAccounts(isAdmin);
  const createAccount = useCreateMemberAccount(session.data?.csrfToken ?? "");
  const usernameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = createMemberAccountRequestSchema.safeParse({ username, password });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setValidationMessage(issue?.message ?? "请检查账号信息。");
      if (issue?.path[0] === "password") {
        passwordInput.current?.focus();
      } else {
        usernameInput.current?.focus();
      }
      return;
    }

    setValidationMessage(null);
    createAccount.mutate(parsed.data, {
      onSuccess: (account) => {
        setUsername("");
        setPassword("");
        notify.success(`成员账号“${account.username}”已创建。`);
        usernameInput.current?.focus();
      },
    });
  };

  if (session.isPending) {
    return <p role="status">正在确认账号权限…</p>;
  }

  if (!isAdmin) {
    return (
      <section className="grid gap-4" aria-labelledby="accounts-title">
        <h1 id="accounts-title">账号管理</h1>
        <Card className="p-6">
          <p role="alert" className="m-0 text-[var(--animal-error-color-active)]">
            只有管理员可以查看和创建账号。
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid gap-7" aria-labelledby="accounts-title">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          管理员功能
        </p>
        <h1 id="accounts-title">账号管理</h1>
        <p>创建成员账号后，通过安全方式将用户名和初始密码告知本人。</p>
      </header>

      <Title color="app-teal">创建成员账号</Title>
      <Card className="p-[22px] sm:p-7">
        <form className="grid max-w-xl gap-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <label className="font-bold" htmlFor="member-username">
              用户名
            </label>
            <input
              ref={usernameInput}
              id="member-username"
              name="username"
              autoComplete="off"
              value={username}
              disabled={createAccount.isPending}
              aria-describedby="username-help"
              className="min-h-11 rounded-xl border border-island-border bg-island-surface px-4 focus-visible:ring-2"
              onChange={(event) => setUsername(event.target.value)}
            />
            <p id="username-help" className="m-0 text-sm text-island-muted">
              2–64 位，只能使用字母、数字、下划线和连字符；保存后统一为小写。
            </p>
          </div>
          <div className="grid gap-2">
            <label className="font-bold" htmlFor="member-password">
              初始密码
            </label>
            <input
              ref={passwordInput}
              id="member-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={createAccount.isPending}
              aria-describedby="password-help"
              className="min-h-11 rounded-xl border border-island-border bg-island-surface px-4 focus-visible:ring-2"
              onChange={(event) => setPassword(event.target.value)}
            />
            <p id="password-help" className="m-0 text-sm text-island-muted">
              至少 8 位。系统不会在创建后再次展示或记录明文密码。
            </p>
          </div>
          {validationMessage ? (
            <p role="alert" className="m-0 text-[var(--animal-error-color-active)]">
              {validationMessage}
            </p>
          ) : null}
          <div>
            <Button type="primary" htmlType="submit" loading={createAccount.isPending}>
              {createAccount.isPending ? "正在创建" : "创建成员账号"}
            </Button>
          </div>
        </form>
      </Card>

      <Title color="app-yellow">现有账号</Title>
      <Card className="overflow-x-auto p-[22px] sm:p-7">
        {accounts.isPending ? <p role="status">正在读取账号…</p> : null}
        {accounts.isError ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="m-0">账号列表读取失败，请稍后重试。</p>
            <Button onClick={() => void accounts.refetch()}>重新加载</Button>
          </div>
        ) : null}
        {accounts.data?.items.length === 0 ? <p>还没有可显示的账号。</p> : null}
        {accounts.data?.items.length ? (
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-island-border">
                <th className="px-3 py-3">用户名</th>
                <th className="px-3 py-3">身份</th>
                <th className="px-3 py-3">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.items.map((account) => (
                <tr className="border-b border-island-border last:border-b-0" key={account.id}>
                  <th scope="row" className="px-3 py-4 font-bold">
                    {account.username}
                  </th>
                  <td className="px-3 py-4">{account.role === "admin" ? "管理员" : "成员"}</td>
                  <td className="px-3 py-4">{formatIsoDateTime(account.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {accounts.isFetching && !accounts.isPending ? (
          <p role="status" className="mb-0 text-sm text-island-muted">
            正在刷新账号列表…
          </p>
        ) : null}
      </Card>
    </section>
  );
}
