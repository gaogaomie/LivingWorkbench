import { Loading } from "animal-island-ui";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "../data-provider/queries/use-auth-session";
import { ApiClientError } from "../services/http-client";

export function AuthGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  const session = useAuthSession();

  if (session.isPending) {
    return <Loading />;
  }

  if (session.error instanceof ApiClientError && session.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
