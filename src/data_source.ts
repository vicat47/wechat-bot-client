import config from "config";
import { DataSource, DataSourceOptions } from "typeorm";
import InMemoryCacheProvider from "typeorm-in-memory-cache";
import { BaseDataSourceOptions } from "typeorm/data-source/BaseDataSourceOptions";
import { SysClient } from "./entity/SysClient";
import { SysConfig } from "./entity/SysConfig";
import { SysModule } from "./entity/SysModule";
import { SysGroup } from "./entity/SysGroup";
import { SysModuleConfig } from "./entity/SysModuleConfig";
import { SysUser } from "./entity/SysUser";
import { SysUserGroup } from "./entity/SysUserGroup";
import { PostRefactoring1704692532677 } from "./migration/1704692532677-PostRefactoring";

export interface IDatasourceConfig {
    type: string;
    host: string;
    port: number;
    schema: string;
    username: string;
    password: string;
    database: string;
}

export function wrapDatasourceConfig(config: IDatasourceConfig, entities: BaseDataSourceOptions["entities"]): DataSourceOptions {
    return {
        type: config.type as any,
        host: config.host,
        port: config.port,
        schema: config.schema,
        username: config.username,
        password: config.password,
        database:config.database,
        synchronize: false,
        // cache: {
        //     duration: 60 * 60 * 1000 // 1h
        // },
        cache: {
            provider() {
                return new InMemoryCacheProvider()
            }
        },
        // 仅记录 error 级别日志
        logging: ["error"],
        // logging: true,
        // 记录查询时长超过 1s 的 sql
        maxQueryExecutionTime: 1000,
        entities,
        subscribers: [],
        migrations: [
            PostRefactoring1704692532677
        ],
    }
}

const datasource = config.get("datasource") as IDatasourceConfig;

export const AppDataSource = new DataSource(wrapDatasourceConfig(datasource, [
    SysClient,
    SysConfig,
    SysGroup,
    SysModule,
    SysModuleConfig,
    SysUser,
    SysUserGroup]));
