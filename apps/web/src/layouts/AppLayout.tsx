import { Outlet } from "react-router-dom";
import { ReminderWatcher } from "../components/ReminderWatcher";
import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[238px_minmax(0,1fr)] xl:grid-cols-[276px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-white px-4 py-3 font-bold shadow-lg transition-transform focus:translate-y-0"
      >
        跳到主要内容
      </a>
      <ReminderWatcher />
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 md:col-start-2">
        <div className="sticky top-0 z-10 flex min-h-15 items-center border-b border-island-border bg-island-surface px-4 md:hidden">
          <MobileNavigation />
        </div>
        <div className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
