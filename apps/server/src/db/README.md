# Database

SQLite Schema、Drizzle Client 和版本化 Migration 的唯一归属目录。正式接入数据库时需要启用 WAL、foreign keys、busy timeout，并在开始接受写请求前完成迁移与可写性检查。
