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

export const globalClient: {
    [clientId: string]: BaseWechatClient
} = {};

const epoch = new Date('2000-01-01T00:00:00.000Z');
export const snowflake = new Snowflake(epoch);

async function main() {
    // -----------------------------
    // 初始化数据库
    await AppDataSource.initialize();
    console.log("connected database");
    console.log("will initialize database");
    await AppDataSource.runMigrations();
    let wechatClientList = await getSysClientList();
    if (wechatClientList.length <= 0) {
        console.log("没有活动的客户端，请检查配置...");
        return;
    }
    for (let config of wechatClientList) {
        let client;
        if (config.clientType === WechatClientTypeEnum.LAOZHANG) {
            client = new WechatLaoZhangClient(config);
        } else {
            client = new WechatComClient(config);
        }
        globalClient[config.id] = client;
        // -------------------
        // 连接客户端
        await client.connect();
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
