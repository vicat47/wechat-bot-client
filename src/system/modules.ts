import Ajv from "ajv";
import {IWechatConfig} from "#/config";
import {getClientModuleGlobalConfig, getSysClientById} from "#system/sys_config";
import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";

const ajv = new Ajv()

interface SysModule {
    register: (arg0: IWechatConfig, arg1: any) => BaseWechatMessageProcessService,
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

export async function registryModuleServices(clientId: string, module: SysModule): Promise<BaseWechatMessageProcessService[]> {
    if (!sysModuleValidate(module)) {
        let errorMessage = sysModuleValidate.errors?.map(item => item.message).join('\n');
        throw new Error(`module validate not pass...${errorMessage}`);
    }
    let moduleConfigList = await getClientModuleGlobalConfig(clientId, {
        moduleCode: module.serviceCode,
    });
    let serviceList: BaseWechatMessageProcessService[] = [];
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
        let processService: BaseWechatMessageProcessService = module.register(client, conf);
        serviceList.push(processService);
        console.log(`服务 ${module.serviceCode}: ${ moduleConfig.id } 已初始化，已加载`);
    }
    return serviceList;
}
