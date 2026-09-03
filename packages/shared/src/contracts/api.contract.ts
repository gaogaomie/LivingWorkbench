export type ApiData = object | null;

export interface ApiResponse<T extends ApiData> {
  code: number | string;
  message: string;
  data: T | null;
}

export interface ApiSuccess<T extends ApiData> extends ApiResponse<T> {
  code: 200;
  data: T;
}

export interface ApiFailure<T extends ApiData = null> extends ApiResponse<T> {
  code: number | string;
  data: T | null;
}

export interface ApiFileData {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export function createApiSuccess<T extends ApiData>(data: T, message = "success"): ApiSuccess<T> {
  return { code: 200, message, data };
}

export function createApiFailure<T extends ApiData = null>(
  code: number | string,
  message: string,
  data: T | null = null,
): ApiFailure<T> {
  return { code, message, data };
}

export function isApiResponse(value: unknown): value is ApiResponse<ApiData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 3 &&
    keys[0] === "code" &&
    keys[1] === "data" &&
    keys[2] === "message" &&
    (typeof record.code === "number" || typeof record.code === "string") &&
    typeof record.message === "string" &&
    (record.data === null || typeof record.data === "object")
  );
}
