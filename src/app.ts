import "reflect-metadata";

import { BaseWechatMessageProcessService, IWechatMessageProcessor, WechatClientTypeEnum } from './wechat/base_wechat';

import WechatLaoZhangClient from './wechat/wechat_laozhang/wechat_laozhang_client';

import load_modules from './modules/load_modules';

import { AppDataSource } from "./data_source";
import { getSysClientList } from "./system/sys_config";
import WechatComClient from "./wechat/wechat_com/wechat_com_client";
import { registryModuleServices } from "./system/modules";
import { BaseWechatClient } from "./wechat/wechat_client";

export const globalClient: {
    [clientId: string]: BaseWechatClient
} = {};

async function main() {
    // -----------------------------
    // 初始化数据库
    await AppDataSource.initialize();
    console.log("connected database");
    console.log("will initlize database");
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
            client = new WechatComClient(config)
        }
        globalClient[config.id] = client;
        // -------------------
        // 连接客户端
        await client.connect();
        // -------------------
        // 加载模块
        let prosessorList: IWechatMessageProcessor[] = [];
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
                    console.warn(`模块 ${v} 初始化出错...${ error }`);
                    return Promise.resolve([]);
                }));
                console.log(`模块 ${v} 已加载`);
            } catch (error) {
                console.warn(`模块 ${v} 已跳过（模块加载出错）`);
                continue;
            }
        }
        let servicesList = (await Promise.all(initList)).reduce<BaseWechatMessageProcessService[]>((a, b) => a.concat(b), []);
        prosessorList.push(...servicesList);
        console.log(`服务启动完成，共启动 ${servicesList.length} 个服务...`);
    }
}

main().catch((error) => console.error("An error occurred:", error));
