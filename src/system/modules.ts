import Ajv from "ajv";
import { IWechatConfig } from "../config";
import { BaseWechatMessageProcessService } from "../wechat/base_wechat";
import { getClientModuleConfig, getSysClientById } from "./sys_config";

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
    let config = await getClientModuleConfig(clientId, {
        moduleCode: module.serviceCode
    });
    let serviceList = [];
    let client = await getSysClientById(clientId);
    if (client === null) {
        throw new Error("sys client id not exists");
    }
    for (let serviceId in config) {
        let conf = config[serviceId];
        conf.id = serviceId;
        serviceList.push(module.register(client, config[serviceId]));
        console.log(`服务 ${module.serviceCode}: ${ serviceId } 已初始化，已加载`);
    }
    return serviceList;
}