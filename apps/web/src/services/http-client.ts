import type { ApiData, ApiFailure, ApiSuccess } from "@daily-life/shared";
import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { publicEnv } from "../config/env";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * 所有浏览器请求共用一个 Axios 实例，Cookie、基础地址和错误格式只在这里维护。
 */
export const httpClient = axios.create({
  baseURL: publicEnv.apiBaseUrl,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure<Record<string, unknown>>>) => {
    const status = error.response?.status ?? 0;
    const details = error.response?.data?.data;
    throw new ApiClientError(
      error.response?.data?.message ??
        (status === 0 ? "网络连接失败，请检查服务是否可用。" : "请求失败，请稍后重试。"),
      status,
      details,
    );
  },
);

export async function requestData<T extends ApiData>(config: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.request<ApiSuccess<T> | undefined>(config);
  return response.status === 204
    ? (undefined as unknown as T)
    : (response.data as ApiSuccess<T>).data;
}

export async function downloadFile(url: string): Promise<Blob> {
  const response = await httpClient.get<Blob>(url, { responseType: "blob" });
  return response.data;
}

export function csrfHeaders(csrfToken: string) {
  return { "x-csrf-token": csrfToken };
}
