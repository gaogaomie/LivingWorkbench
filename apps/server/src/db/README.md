# Database

SQLite Schema、Drizzle Client 和版本化 Migration 的唯一归属目录。正式接入数据库时需要启用 WAL、foreign keys、busy timeout，并在开始接受写请求前完成迁移与可写性检查。

## 账号角色迁移

`0001_overconfident_lenny_balinger.sql` 为用户表增加 `role` 字段。升级已有数据库时，最早创建且未删除的账号会被设为 `admin`；以后创建的账号默认是 `member`。迁移只追加字段，不删除业务数据。

SQLite 不支持安全地直接删除该列。需要回退旧版本时，应先停止服务并恢复迁移前的完整数据库备份，而不是手工修改用户表；恢复后再启动旧版本应用。
