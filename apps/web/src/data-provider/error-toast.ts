import { ApiClientError } from "../services/http-client";
import { notify } from "../services/notification.service";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }
  return "操作没有完成，请稍后重试。";
}

export function showErrorToast(error: unknown): void {
  if (error instanceof ApiClientError && error.status === 401) return;
  notify.error(getErrorMessage(error));
}
