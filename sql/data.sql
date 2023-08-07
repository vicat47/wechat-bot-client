/*
 Navicat Premium Data Transfer

 Source Server         : nas_192.168.31.15_5433
 Source Server Type    : PostgreSQL
 Source Server Version : 140007
 Source Host           : 192.168.31.15:5433
 Source Catalog        : wechat_bot
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 140007
 File Encoding         : 65001

 Date: 07/08/2023 21:47:34
*/


-- ----------------------------
-- Sequence structure for module_config_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."module_config_id_seq";
CREATE SEQUENCE "public"."module_config_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for sys_client_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_client_id_seq";
CREATE SEQUENCE "public"."sys_client_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for sys_config_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_config_id_seq";
CREATE SEQUENCE "public"."sys_config_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 2;

-- ----------------------------
-- Sequence structure for sys_module_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_module_id_seq";
CREATE SEQUENCE "public"."sys_module_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for sys_user_group_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_user_group_id_seq";
CREATE SEQUENCE "public"."sys_user_group_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 2;

-- ----------------------------
-- Table structure for sys_client
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_client";
CREATE TABLE "public"."sys_client" (
  "id" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT nextval('sys_client_id_seq'::regclass),
  "http_url" varchar(255) COLLATE "pg_catalog"."default",
  "websocket_url" varchar(255) COLLATE "pg_catalog"."default",
  "mqtt_url" varchar(255) COLLATE "pg_catalog"."default",
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp(),
  "client_type" char(1) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "public"."sys_client"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_client"."http_url" IS 'HTTP_URL';
COMMENT ON COLUMN "public"."sys_client"."websocket_url" IS 'websocket_url';
COMMENT ON COLUMN "public"."sys_client"."mqtt_url" IS 'mqtt url';
COMMENT ON COLUMN "public"."sys_client"."name" IS 'wechat name';
COMMENT ON COLUMN "public"."sys_client"."create_time" IS '创建时间';
COMMENT ON COLUMN "public"."sys_client"."client_type" IS '客户端类型
0：laozhang
1：com';

-- ----------------------------
-- Table structure for sys_config
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_config";
CREATE TABLE "public"."sys_config" (
  "id" int4 NOT NULL DEFAULT nextval('sys_config_id_seq'::regclass),
  "name" varchar(50) COLLATE "pg_catalog"."default",
  "key" varchar(255) COLLATE "pg_catalog"."default",
  "value" varchar(255) COLLATE "pg_catalog"."default",
  "type" varchar(255) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp()
)
;
COMMENT ON COLUMN "public"."sys_config"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_config"."name" IS '名称';
COMMENT ON COLUMN "public"."sys_config"."key" IS 'key';
COMMENT ON COLUMN "public"."sys_config"."value" IS 'value';
COMMENT ON COLUMN "public"."sys_config"."type" IS '配置类型';
COMMENT ON COLUMN "public"."sys_config"."create_time" IS '创建时间';

-- ----------------------------
-- Records of sys_config
-- ----------------------------
INSERT INTO "public"."sys_config" VALUES (1, '管理员', 'sys.admin', 'test_123123', 'string', '2023-08-04 17:50:42.585776+00');

-- ----------------------------
-- Table structure for sys_group
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_group";
CREATE TABLE "public"."sys_group" (
  "id" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "nick_name" varchar(255) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp()
)
;
COMMENT ON COLUMN "public"."sys_group"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_group"."name" IS '名称';
COMMENT ON COLUMN "public"."sys_group"."nick_name" IS '昵称';
COMMENT ON COLUMN "public"."sys_group"."create_time" IS '添加时间';

-- ----------------------------
-- Table structure for sys_module
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_module";
CREATE TABLE "public"."sys_module" (
  "id" int4 NOT NULL DEFAULT nextval('sys_module_id_seq'::regclass),
  "code" varchar(50) COLLATE "pg_catalog"."default",
  "name" varchar(50) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp(),
  "module_code" varchar(50) COLLATE "pg_catalog"."default",
  "client_id" varchar(30) COLLATE "pg_catalog"."default",
  "type" char(1) COLLATE "pg_catalog"."default" DEFAULT 0,
  "priority" int4,
  "enable" char(1) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "public"."sys_module"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_module"."code" IS '模块业务code';
COMMENT ON COLUMN "public"."sys_module"."name" IS '模块名称';
COMMENT ON COLUMN "public"."sys_module"."create_time" IS '创建时间';
COMMENT ON COLUMN "public"."sys_module"."module_code" IS '模块code';
COMMENT ON COLUMN "public"."sys_module"."client_id" IS '模块client id';
COMMENT ON COLUMN "public"."sys_module"."type" IS '类型：0：local,1：remote';
COMMENT ON COLUMN "public"."sys_module"."priority" IS '优先级';
COMMENT ON COLUMN "public"."sys_module"."enable" IS '0: 禁用；1: 启用';

-- ----------------------------
-- Table structure for sys_module_config
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_module_config";
CREATE TABLE "public"."sys_module_config" (
  "id" int4 NOT NULL DEFAULT nextval('module_config_id_seq'::regclass),
  "sys_module_id" int4,
  "key" varchar(255) COLLATE "pg_catalog"."default",
  "value" varchar(5000) COLLATE "pg_catalog"."default",
  "user_id" varchar(32) COLLATE "pg_catalog"."default",
  "group_id" varchar(32) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp(),
  "type" varchar(20) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "public"."sys_module_config"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_module_config"."sys_module_id" IS '模块ID';
COMMENT ON COLUMN "public"."sys_module_config"."key" IS 'key';
COMMENT ON COLUMN "public"."sys_module_config"."value" IS 'value';
COMMENT ON COLUMN "public"."sys_module_config"."user_id" IS '用户ID';
COMMENT ON COLUMN "public"."sys_module_config"."group_id" IS '群组ID';
COMMENT ON COLUMN "public"."sys_module_config"."create_time" IS '创建时间';
COMMENT ON COLUMN "public"."sys_module_config"."type" IS '配置类型';

-- ----------------------------
-- Records of sys_module_config
-- ----------------------------
INSERT INTO "public"."sys_module_config" VALUES (1, 1, 'modulePrice', '{"gpt-3.5-turbo-0301_output":0.002,"gpt-3.5-turbo-0301_input":0.0015,"gpt-3.5-turbo-0613_input":0.0015,"gpt-3.5-turbo-0613_output":0.002,"gpt-3.5-turbo_output":0.002,"gpt-3.5-turbo_input":0.0015,"gpt-3.5-turbo-16k-0613_output":0.003,"gpt-3.5-turbo-16k-0613_input":0.004,"gpt-3.5-turbo-16k_output":0.003,"gpt-3.5-turbo-16k_input":0.004}', NULL, NULL, '2023-08-07 10:49:44.994436+00', 'json');

-- ----------------------------
-- Table structure for sys_module_permission
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_module_permission";
CREATE TABLE "public"."sys_module_permission" (
  "id" int4 NOT NULL DEFAULT nextval('sys_module_permission_id_seq'::regclass),
  "module_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "function_id" varchar(50) COLLATE "pg_catalog"."default",
  "user_id" int4,
  "group_id" int4,
  "black_list" char(1) COLLATE "pg_catalog"."default" DEFAULT 0,
  "create_time" timestamptz(6) DEFAULT clock_timestamp()
)
;
COMMENT ON COLUMN "public"."sys_module_permission"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_module_permission"."module_id" IS '模块ID';
COMMENT ON COLUMN "public"."sys_module_permission"."function_id" IS '执行函数ID
@all：全部函数';
COMMENT ON COLUMN "public"."sys_module_permission"."user_id" IS '用户ID
@all：全部用户';
COMMENT ON COLUMN "public"."sys_module_permission"."group_id" IS '群组ID
@all：全部群组';
COMMENT ON COLUMN "public"."sys_module_permission"."black_list" IS '是否为黑名单
0：是
1：否';
COMMENT ON COLUMN "public"."sys_module_permission"."create_time" IS '创建时间';

-- ----------------------------
-- Records of sys_module_permission
-- ----------------------------

-- ----------------------------
-- Table structure for sys_user
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_user";
CREATE TABLE "public"."sys_user" (
  "id" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "nick_name" varchar(255) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp(),
  "user_type" char(1) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "public"."sys_user"."id" IS 'id：微信ID';
COMMENT ON COLUMN "public"."sys_user"."name" IS '名称';
COMMENT ON COLUMN "public"."sys_user"."nick_name" IS '昵称';
COMMENT ON COLUMN "public"."sys_user"."create_time" IS '添加时间';
COMMENT ON COLUMN "public"."sys_user"."user_type" IS '用户类型：0：用户，1：租户';

-- ----------------------------
-- Table structure for sys_user_group
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_user_group";
CREATE TABLE "public"."sys_user_group" (
  "id" int4 NOT NULL DEFAULT nextval('sys_user_group_id_seq'::regclass),
  "user_id" varchar(30) COLLATE "pg_catalog"."default",
  "group_id" varchar(30) COLLATE "pg_catalog"."default",
  "create_time" timestamptz(6) DEFAULT clock_timestamp()
)
;
COMMENT ON COLUMN "public"."sys_user_group"."id" IS 'id';
COMMENT ON COLUMN "public"."sys_user_group"."user_id" IS '用户ID';
COMMENT ON COLUMN "public"."sys_user_group"."group_id" IS '群ID';
COMMENT ON COLUMN "public"."sys_user_group"."create_time" IS '时间';

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."module_config_id_seq"
OWNED BY "public"."sys_module_config"."id";
SELECT setval('"public"."module_config_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_client_id_seq"
OWNED BY "public"."sys_client"."id";
SELECT setval('"public"."sys_client_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."sys_config_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_module_id_seq"
OWNED BY "public"."sys_module"."id";
SELECT setval('"public"."sys_module_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."sys_module_permission_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."sys_user_group_id_seq"', 1, true);

-- ----------------------------
-- Primary Key structure for table sys_client
-- ----------------------------
ALTER TABLE "public"."sys_client" ADD CONSTRAINT "sys_client_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table sys_config
-- ----------------------------
ALTER TABLE "public"."sys_config" ADD CONSTRAINT "sys_config_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table sys_group
-- ----------------------------
ALTER TABLE "public"."sys_group" ADD CONSTRAINT "sys_group_pk_unique" UNIQUE ("id");
COMMENT ON CONSTRAINT "sys_group_pk_unique" ON "public"."sys_group" IS '微信ID必须唯一';

-- ----------------------------
-- Primary Key structure for table sys_group
-- ----------------------------
ALTER TABLE "public"."sys_group" ADD CONSTRAINT "sys_group_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table sys_module
-- ----------------------------
ALTER TABLE "public"."sys_module" ADD CONSTRAINT "sys_module_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table sys_module_config
-- ----------------------------
ALTER TABLE "public"."sys_module_config" ADD CONSTRAINT "module_config_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table sys_module_permission
-- ----------------------------
ALTER TABLE "public"."sys_module_permission" ADD CONSTRAINT "sys_module_permission_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table sys_user
-- ----------------------------
ALTER TABLE "public"."sys_user" ADD CONSTRAINT "sys_user_pk_unique" UNIQUE ("id");
COMMENT ON CONSTRAINT "sys_user_pk_unique" ON "public"."sys_user" IS '微信id必须唯一';

-- ----------------------------
-- Primary Key structure for table sys_user
-- ----------------------------
ALTER TABLE "public"."sys_user" ADD CONSTRAINT "sys_user_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table sys_user_group
-- ----------------------------
ALTER TABLE "public"."sys_user_group" ADD CONSTRAINT "group_user_unique" UNIQUE ("user_id", "group_id");
COMMENT ON CONSTRAINT "group_user_unique" ON "public"."sys_user_group" IS '群组中用户唯一';

-- ----------------------------
-- Primary Key structure for table sys_user_group
-- ----------------------------
ALTER TABLE "public"."sys_user_group" ADD CONSTRAINT "sys_user_group_pkey" PRIMARY KEY ("id");
