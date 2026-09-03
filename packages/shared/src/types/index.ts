export type EntityId = string;
export type LocalDate = `${number}-${number}-${number}`;
export type YearMonth = `${number}-${number}`;
export type ISODateTime = string;

export interface EntityMeta {
  id: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
  isDemo: boolean;
  schemaVersion: number;
}

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVER_UNAVAILABLE"
  | "DATABASE_UNAVAILABLE"
  | "MIGRATION_FAILED"
  | "BACKUP_FAILED"
  | "AI_KEY_INVALID"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID";
