import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { ErrorPage } from "../pages/error/ErrorPage";
import { OverviewPage } from "../pages/overview";
import { AuthGuard } from "./AuthGuard";

const routeFallback = <div aria-live="polite">页面加载中，请稍候…</div>;

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: () => import("../pages/login"),
    hydrateFallbackElement: routeFallback,
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    errorElement: <ErrorPage />,
    hydrateFallbackElement: routeFallback,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "finance", lazy: () => import("../pages/finance") },
      { path: "habits", lazy: () => import("../pages/habits") },
      { path: "fitness", lazy: () => import("../pages/fitness") },
      { path: "schedule", lazy: () => import("../pages/schedule") },
      { path: "shopping", lazy: () => import("../pages/shopping") },
      { path: "media", lazy: () => import("../pages/media") },
      { path: "timeline", lazy: () => import("../pages/timeline") },
      { path: "settings", lazy: () => import("../pages/settings") },
      { path: "settings/accounts", lazy: () => import("../pages/accounts") },
      { path: "settings/ai", lazy: () => import("../pages/settings") },
      { path: "settings/data", lazy: () => import("../pages/settings") },
      { path: "settings/appearance", lazy: () => import("../pages/settings") },
    ],
  },
]);
