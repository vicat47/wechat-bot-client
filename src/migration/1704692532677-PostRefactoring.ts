import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class PostRefactoring1704692532677 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log(`database type: ${queryRunner.connection.options.type}`);
        let cTimeFieldProvider;
        if (queryRunner.connection.options.type === "sqlite") {
            cTimeFieldProvider = function() {
                return {
                    name: "create_time",
                    type: "datetime",
                    default: "(datetime(current_timestamp))"
                }
            }
        } else {
            cTimeFieldProvider = function() {
                return {
                    name: "create_time",
                    type: "timestamptz",
                    default: "clock_timestamp()"
                }
            }
        }
        await queryRunner.createTable(
            new Table({
                name: "sys_client",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                        comment: "id"
                    },
                    {
                        name: "http_url",
                        type: "varchar"
                    },
                    {
                        name: "websocket_url",
                        type: "varchar"
                    },
                    {
                        name: "mqtt_url",
                        type: "varchar"
                    },
                    {
                        name: "name",
                        type: "varchar"
                    },
                    {
                        name: "client_type",
                        type: "integer",
                        comment: "客户端类型\n0: laozhang\n1: com"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_client' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_config",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar"
                    },
                    {
                        name: "key",
                        type: "varchar"
                    },
                    {
                        name: "value",
                        type: "varchar"
                    },
                    {
                        name: "type",
                        type: "varchar"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_config' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_group",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                    },
                    {
                        name: "name",
                        type: "varchar"
                    },
                    {
                        name: "nick_name",
                        type: "varchar"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_group' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_module",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "code",
                        type: "varchar"
                    },
                    {
                        name: "name",
                        type: "varchar"
                    },
                    {
                        name: "module_code",
                        type: "varchar"
                    },
                    {
                        name: "client_id",
                        type: "varchar"
                    },
                    {
                        name: "type",
                        type: "varchar",
                        default: "0",
                    },
                    {
                        name: "priority",
                        type: "integer"
                    },
                    {
                        name: "enable",
                        type: "integer"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_module' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_module_config",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "sys_module_id",
                        type: "integer",
                    },
                    {
                        name: "key",
                        type: "varchar"
                    },
                    {
                        name: "value",
                        type: "varchar"
                    },
                    {
                        name: "user_id",
                        type: "varchar"
                    },
                    {
                        name: "group_id",
                        type: "varchar"
                    },
                    {
                        name: "type",
                        type: "varchar"
                    },
                    {
                        name: "enable",
                        type: "varchar",
                        default: "1"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_module_config' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_module_permission",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "module_id",
                        type: "varchar",
                    },
                    {
                        name: "function_id",
                        type: "varchar"
                    },
                    {
                        name: "user_id",
                        type: "varchar"
                    },
                    {
                        name: "group_id",
                        type: "varchar"
                    },
                    {
                        name: "black_list",
                        type: "varchar",
                        default: "0",
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_module_permission' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_user",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        isPrimary: true,
                    },
                    {
                        name: "name",
                        type: "varchar",
                    },
                    {
                        name: "nick_name",
                        type: "varchar"
                    },
                    {
                        name: "user_type",
                        type: "varchar",
                        comment: "用户类型:0:用户,1:租户"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_user' created");
        await queryRunner.createTable(
            new Table({
                name: "sys_user_group",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "user_id",
                        type: "varchar"
                    },
                    {
                        name: "group_id",
                        type: "varchar"
                    },
                    {
                        name: "nick_name",
                        type: "varchar"
                    },
                    cTimeFieldProvider(),
                ]
            }),
            true
        );
        console.log("table 'sys_user_group' created");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("sys_client");
        await queryRunner.dropTable("sys_config");
        await queryRunner.dropTable("sys_group");
        await queryRunner.dropTable("sys_module");
        await queryRunner.dropTable("sys_module_config");
        await queryRunner.dropTable("sys_module_permission");
        await queryRunner.dropTable("sys_user");
        await queryRunner.dropTable("sys_user_group");
    }

}
