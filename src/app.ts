import "reflect-metadata";
import "module-alias/register"

import load_modules from "#modules/load_modules";
import {AppDataSource} from "#/data_source";
import {getSysClientList} from "#system/sys_config";
import {registryModuleServices} from "#system/modules";
import {WechatClientTypeEnum} from "#wechat/base_wechat";
import WechatLaoZhangClient from "#wechat/clients/wechat_laozhang/wechat_laozhang_client";
import WechatComClient from "#wechat/clients/wechat_com/wechat_com_client";
import {BaseWechatClient} from "#wechat/clients/wechat_client";
import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";
import {Snowflake} from '@sapphire/snowflake';
import config from "config";
import {IWechatConfig} from "#/config";
import {insertSysClient, updateSysClientPersonInfo} from "#/dao/sys_client";
import Ajv from "ajv";
import {SysClient} from "#entity/SysClient";
import {syncUserList} from "#system/sys_contact";

export const globalClient: {
    [clientId: string]: BaseWechatClient
} = {};

const epoch = new Date('2000-01-01T00:00:00.000Z');
export const snowflake = new Snowflake(epoch);
const ajv = new Ajv();
const sysClientSchema = ajv.compile({
    type: 'object',
    properties: {
        id: {type: "string"},
        clientType: {type: "integer", enum: [0, 1]},
        name: {type: "string"},
        httpUrl: {type: "string", pattern: "https?://[^\\s]*"},
        webSocketUrl: {type: "string"},
        mqttUrl: {type: "string"},
    },
    required: ["clientType", "httpUrl", "webSocketUrl"],
});

async function updateClient(config: SysClient, client: BaseWechatClient) {
    let personInfo = await client.updatePersonInfo();
    if ((config as any)?.source === "config") {
        config.id = personInfo.id;
        config.name = personInfo.name;
        await insertSysClient({
            ...config
        } as any);
    } else if (config.id !== personInfo.id || config.name !== personInfo.name) {
        console.warn("数据库中数据与接口不同，将更新数据库...");
        let preId = config.id;
        if (config.id !== personInfo.id) {
            config.id = personInfo.id;
        }
        if (config.name !== personInfo.name) {
            config.name = personInfo.name;
        }
        await updateSysClientPersonInfo(preId, config);
    }
}

async function main() {
    // -----------------------------
    // 初始化数据库
    await AppDataSource.initialize();
    console.log("connected database");
    await AppDataSource.runMigrations();
    let wechatClientList = await getSysClientList();
    if (wechatClientList.length <= 0) {
        console.warn("数据库中没有活动的客户端，将从配置文件中读取并写入数据库...");
        let wechatServer = config.util.cloneDeep(config.get("wechat_server") as IWechatConfig);
        console.debug(wechatServer);
        if (!sysClientSchema(wechatServer)) {
            let errorMessage = sysClientSchema.errors?.map(item => item.message).join('\n');
            throw new Error(`request validate not pass...${errorMessage}`);
        }
        (wechatServer as any)["source"] = "config";
        wechatClientList.push(wechatServer as unknown as SysClient);
    }
    for (let config of wechatClientList) {
        let client: BaseWechatClient;
        if (config.clientType === WechatClientTypeEnum.LAOZHANG) {
            client = new WechatLaoZhangClient(config);
        } else {
            client = new WechatComClient(config);
        }
        await updateClient(config, client);
        // TODO: 初始化: 解决没有详细配置项时服务不启动的问题
        globalClient[config.id] = client;
        // -------------------
        // 连接客户端
        await client.connect();
        console.log("客户端已连接，将同步用户列表...");
        await syncUserList(client);
        // -------------------
        // 加载模块
        let initList = [];
        let modules = load_modules("");
        for (let v in modules) {
            let module = modules[v];
            if (module === undefined) {
                continue;
            }
            try {
                // 加载模块
                let m = module();
                initList.push(registryModuleServices(config.id, m).catch((error) => {
                    console.warn(`${config.id} 模块 ${v} 初始化出错...${ error }`);
                    return Promise.resolve([]);
                }));
                console.log(`${client.id} 模块 ${v} 已加载`);
            } catch (error) {
                console.warn(`${client.id} 模块 ${v} 已跳过（模块加载出错）`);
            }
        }
        let servicesList = (await Promise.all(initList)).reduce<BaseWechatMessageProcessService[]>((a, b) => a.concat(b), []);
        client.registryMessageProcessServices(...servicesList);
        console.log(`id: ${client.id} 下服务启动完成，共启动 ${servicesList.length} 个服务...`);
    }
}

main().catch((error) => console.error("An error occurred:", error));
