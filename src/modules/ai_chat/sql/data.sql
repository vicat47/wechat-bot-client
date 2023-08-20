-- ----------------------------
-- Sequence structure for sys_module_permission_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_module_permission_id_seq";
CREATE SEQUENCE "public"."sys_module_permission_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 2;

-- ----------------------------
-- Table structure for mod_chat_gpt_api_model_request
-- ----------------------------
DROP TABLE IF EXISTS "public"."mod_chat_gpt_api_model_request";
CREATE TABLE "public"."mod_chat_gpt_api_model_request" (
  "id" int4 NOT NULL DEFAULT nextval('mod_chat_gpt_api_model_request_id_seq'::regclass),
  "remote_id" varchar(255) COLLATE "pg_catalog"."default",
  "user_id" varchar(30) COLLATE "pg_catalog"."default",
  "group_id" varchar(30) COLLATE "pg_catalog"."default",
  "model" varchar(255) COLLATE "pg_catalog"."default",
  "define_price" varchar(100) COLLATE "pg_catalog"."default",
  "completion_tokens" int4,
  "prompt_tokens" int4,
  "total_tokens" int4,
  "price" numeric(10,8),
  "create_time" timestamptz(6) DEFAULT clock_timestamp()
)
;
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."id" IS 'id';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."remote_id" IS '远端id';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."user_id" IS '用户id';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."group_id" IS '群id';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."model" IS '模型';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."define_price" IS '调用时价格';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."completion_tokens" IS '完成 token';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."prompt_tokens" IS '提示 token';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."total_tokens" IS '总 token 数';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."price" IS '该条请求的实际价格';
COMMENT ON COLUMN "public"."mod_chat_gpt_api_model_request"."create_time" IS '调用时间';

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."mod_chat_gpt_api_model_request_id_seq"
OWNED BY "public"."mod_chat_gpt_api_model_request"."id";
SELECT setval('"public"."mod_chat_gpt_api_model_request_id_seq"', 1, true);

-- ----------------------------
-- Primary Key structure for table mod_chat_gpt_api_model_request
-- ----------------------------
ALTER TABLE "public"."mod_chat_gpt_api_model_request" ADD CONSTRAINT "mod_chat_gpt_api_model_request_pkey" PRIMARY KEY ("id");