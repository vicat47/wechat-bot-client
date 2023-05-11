import { IWechatMessageProcessor } from './wechat/base_wechat';
// import { wechatConfig } from './config';

import WechatLaoZhangClient from './wechat/wechat_laozhang/wechat_laozhang_client';

import load_modules from './modules/load_modules';
import { BaseWechatClient } from './wechat/wechat_client';

import config from "config";
import { IWechatConfig } from './config';

let wechatConfig = config.get("wechat_server") as IWechatConfig;
const client: BaseWechatClient = new WechatLaoZhangClient(wechatConfig);

client.connect()
    .then(() => {
        let prosessorList: IWechatMessageProcessor[] = [];
        let modules = load_modules("");
        for (let v in modules) {
            let module = modules[v];
            if (module === undefined) {
                continue;
            }
            try {
                let serviceList: IWechatMessageProcessor[] = module()['default'];
                if (serviceList === undefined || serviceList === null) {
                    console.log(`模块 ${v} 已跳过（模块未初始化）`);
                    continue;
                }
                prosessorList.push(...serviceList);
                console.log(`模块 ${v} 已加载`);
            } catch (error) {
                console.warn(`模块 ${v} 已跳过（模块加载出错）`);
                continue;
            }
        }
    });