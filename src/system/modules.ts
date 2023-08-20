import Ajv from "ajv";
import { IWechatConfig } from "../config";
import { BaseWechatMessageProcessService } from "../wechat/base_wechat";
import { getClientModuleGlobalConfig, getSysClientById } from "./sys_config";

const ajv = new Ajv()

interface SysModule {
    register: <T extends BaseWechatMessageProcessService>(arg0: IWechatConfig, arg1: any) => T,
    serviceCode: string,
}

const sysModuleSchema = {
    type: "object",
    properties: {
        serviceCode: { type: "string" },
    },
    required: ["register", "serviceCode"],
    additionalProperties: true
}
const sysModuleValidate = ajv.compile(sysModuleSchema);

export async function registryModuleServices<T extends BaseWechatMessageProcessService>(clientId: string, module: SysModule): Promise<T[]> {
    if (!sysModuleValidate(module)) {
        let errorMessage = sysModuleValidate.errors?.map(item => item.message).join('\n');
        throw new Error(`module validate not pass...${errorMessage}`);
    }
    let moduleConfigList = await getClientModuleGlobalConfig(clientId, {
        moduleCode: module.serviceCode,
    });
    let serviceList = [];
    let client = await getSysClientById(clientId);
    if (client === null) {
        throw new Error("sys client id not exists");
    }
    for (let moduleConfig of moduleConfigList) {
        let conf = moduleConfig.configObject[moduleConfig.id];
        if (conf === undefined) {
            // 处理没有具体模块配置项的模块
            conf = {};
        }
        conf.id = moduleConfig.id.toString();
        serviceList.push(module.register(client, conf));
        console.log(`服务 ${module.serviceCode}: ${ moduleConfig.id } 已初始化，已加载`);
    }
    return serviceList;
}