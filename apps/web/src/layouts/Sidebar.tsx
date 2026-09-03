import { Button, Icon, type IconName, Tooltip } from "animal-island-ui";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import dailyAnimals from "../assets/daily-animals.png";
import { adminNavigation, dataNavigation, primaryNavigation } from "../constants/route-paths";
import { useLogout } from "../data-provider/mutations/use-logout";
import { useAuthSession } from "../data-provider/queries/use-auth-session";

const [overviewNavigation, ...lifeNavigation] = primaryNavigation;

function NavigationGroup({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<{ label: string; to: string; icon: IconName }>;
}) {
  return (
    <nav aria-label={label}>
      <p className="mb-1 mt-5 px-3 text-xs font-bold tracking-[0.14em] text-island-muted">
        {label}
      </p>
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            `mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-semibold transition-colors hover:bg-island-active focus-visible:ring-2 ${
              isActive ? "bg-island-active" : ""
            }`
          }
          end={item.to === "/"}
          key={item.to}
          to={item.to}
        >
          <Icon aria-hidden="true" name={item.icon} size={21} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const authSession = useAuthSession();
  const logout = useLogout();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const username = authSession.data?.user.username ?? "岛民";
  const timeLabel = format(now, "M月d日 EEEE HH:mm", { locale: zhCN });

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      navigate("/login", { replace: true });
    } catch {
      // The mutation keeps its error state so the user can retry without losing the session.
    }
  };

  return (
    <aside className="fixed inset-y-3 left-3 z-20 hidden w-[214px] flex-col overflow-y-auto rounded-[28px] border border-white/90 bg-[linear-gradient(180deg,var(--animal-island-sidebar-bg-start),var(--animal-island-sidebar-bg-end))] p-4 shadow-island md:flex xl:w-[252px]">
      <NavLink className="flex items-center gap-3 px-2 py-2" to="/" aria-label="回到今日总览">
        <img
          className="h-14 w-20 object-contain"
          src={dailyAnimals}
          alt=""
          width="1952"
          height="1266"
        />
        <span>
          <strong className="block text-xl">日常集</strong>
          <small className="text-island-muted">岛民的每一天</small>
        </span>
      </NavLink>
      <div className="flex-1 py-2">
        <NavLink
          className={({ isActive }) =>
            `mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 font-semibold transition-colors hover:bg-island-active focus-visible:ring-2 ${
              isActive ? "bg-island-active" : ""
            }`
          }
          end
          to={overviewNavigation.to}
        >
          <Icon aria-hidden="true" name={overviewNavigation.icon} size={21} />
          {overviewNavigation.label}
        </NavLink>
        <NavigationGroup label="生活模块" items={lifeNavigation} />
        <NavigationGroup label="数据" items={dataNavigation} />
        {authSession.data?.user.role === "admin" ? (
          <NavigationGroup label="管理" items={adminNavigation} />
        ) : null}
      </div>
      <footer className="rounded-2xl bg-white/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <strong>{username}</strong>
          <Tooltip title="退出登录" placement="top-end" trigger="hover" variant="island">
            <Button
              type="text"
              size="small"
              icon={<Icon name="icon-helicopter" size={22} bounce />}
              loading={logout.isPending}
              aria-label="退出登录"
              onClick={handleLogout}
            />
          </Tooltip>
        </div>
        <time className="mt-1 block text-sm text-island-muted" dateTime={now.toISOString()}>
          {timeLabel}
        </time>
      </footer>
    </aside>
  );
}
