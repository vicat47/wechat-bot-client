import { In } from "typeorm";
import { IWechatConfig } from "../config";
import { AppDataSource } from "../data_source";
import { SysClient } from "../entity/SysClient";
import { SysConfig } from "../entity/SysConfig";
import { SysModule } from "../entity/SysModule";
import { SysModuleConfig } from "../entity/SysModuleConfig";
import { asEnum, mergeDeep } from "../utils/tool";

const configRepository = AppDataSource.getRepository(SysConfig);
const moduleRepository = AppDataSource.getRepository(SysModule);
const moduleConfigRepository = AppDataSource.getRepository(SysModuleConfig);
const sysClientRepository = AppDataSource.getRepository(SysClient);

enum ConfigType {
    JSON = 'json',
    String = 'string',
    Number = 'number',
}

export enum EnableStatus {
    ENABLE = '1',
    DISABLE = '0',
}

const ConfigTypeProcessor = {
    [ConfigType.JSON]: (value: string) => JSON.parse(value),
    [ConfigType.String]: (value: string) => value,
    [ConfigType.Number]: (value: string) => Number(value)
}

export async function getSysClientList(): Promise<SysClient[]> {
    return await sysClientRepository
        .find();
}

export async function getSysClientById(id: string): Promise<SysClient | null> {
    return await sysClientRepository.findOne({ where: { id } });
}

export async function getClientName(id: string): Promise<string | undefined> {
    return (await sysClientRepository
        .findOne({
            where: {
                id
            }
        }))?.name;
}

/**
 * 模块配置接口
 */
interface IModuleConfig {
    [moduleId: string]: any;
}

interface IBaseClientConfigOption {
    userId?: string;
    groupId?: string;
}

interface IBaseClientGetConfigOption extends IBaseClientConfigOption {
    keys?: string[];
}

interface IBaseClientSetConfigOption extends IBaseClientConfigOption {
    configs: {
        [k: string]: any
    };
}

interface IClientConfigOption extends IBaseClientGetConfigOption {
    moduleCode?: string;
}

export async function saveModuleConfig(moduleId: string, options: IBaseClientSetConfigOption) {
    let query = (await Promise.all(Object.keys(options.configs).map(k => {
        return moduleConfigRepository.findOne({
            where: {
                userId: options.userId,
                groupId: options.groupId,
                key: k,
                enable: EnableStatus.ENABLE,
            }
        }).catch(e => Promise.resolve(undefined));
    }))).reduce((acc, curr) => {
        if (curr?.key !== undefined) {
            acc[curr?.key] = curr.id;
        }
        return acc;
    }, {} as {[k: string]: string});
    
    let configs = Object.keys(options.configs)
        .map(k => {
            let conf = new SysModuleConfig();
            conf.id = query[k];
            conf.sysModuleId = moduleId;
            conf.userId = options.userId as any;
            conf.groupId = options.groupId as any;
            conf.key = k;
            conf.enable = EnableStatus.ENABLE;
            let value = options.configs[k];
            if (typeof value === 'string') {
                conf.value = value;
                conf.type = ConfigType.String;
            } else if (typeof value === 'number') {
                conf.value = value.toString();
                conf.type = ConfigType.Number;
            } else {
                conf.value = JSON.stringify(value);
                conf.type = ConfigType.JSON;
            }
            return conf;
        });
    return await moduleConfigRepository.save(configs);
}

/**
 * 通过 clientId 和 options 获取所有模块配置列表的接口
 * @param clientId 客户端 ID
 * @param options 参数
 * @returns 返回获取的模块列表
 */
export async function getClientModuleConfig(clientId: string, options?: IClientConfigOption): Promise<SysModule[]> {
    let moduleConfigList = await moduleRepository.find({
        relations: {
            configs: true
        },
        where: {
            enable: EnableStatus.ENABLE,
            clientId: clientId,
            moduleCode: options?.moduleCode,
            configs: {
                enable: EnableStatus.ENABLE,
                key: options?.keys === undefined ? undefined: In(options.keys),
            },
        }
    });
    return moduleConfigList;
}

interface ISysModuleObjectConfig extends SysModule {
    configObject: any;
}

export async function getClientModuleGlobalConfig(clientId: string, options?: IClientConfigOption): Promise<ISysModuleObjectConfig[]> {
    let moduleConfigList = await getClientModuleConfig(clientId, options) as ISysModuleObjectConfig[];
    for (let moduleConfig of moduleConfigList) {
        moduleConfig.configObject = generateModuleConfig(moduleConfig.configs);
    }
    return moduleConfigList;
}

/**
 * 通过 moduleId 获取配置文件的方法。
 *  用户+群组ID 都为 null 的为模块默认配置
 *  用户 != null 群组 == null 为用户配置
 *  用户 == null 群组 != null 为群配置
 *  用户 != null 群组 != null 为群内用户配置。默认都应该取得群内用户配置。
 *  全局配置  => 用户 = null, 群 = null
 *    单聊配置 => 用户 != null, 群 = null
 *      返回
 *    群聊配置 => 用户 = null, 群 != null
 *      群中用户配置 => 用户 != null, 群 != null
 * @param clientId 微信客户端ID
 * @param options 配置项
 *  moduleCode 模块的 Code
 *  userId 用户ID
 *  groupId 群组ID
 *  key 要查的 key
 * @returns 
 */
export async function getModuleConfig(moduleId: string, options?: IBaseClientGetConfigOption): Promise<any> {
    let moduleConfig = await moduleRepository.findOne({
        relations: {
            configs: true,
        },
        where: {
            enable: EnableStatus.ENABLE,
            id: moduleId,
            configs: {
                enable: EnableStatus.ENABLE,
                key: options?.keys === undefined ? undefined: In(options.keys),
            }
        }
    });
    if (moduleConfig === undefined || moduleConfig === null) {
        return undefined;
    }
    let cfg = generateModuleConfig(moduleConfig.configs, options)[moduleId] as {
        [k: string]: any
    };
    return cfg;
}

function generateModuleConfig(moduleConfigList: SysModuleConfig[], options?: IBaseClientGetConfigOption) {
    let moduleConfig: IModuleConfig = {}
    // 全局配置
    if (options === undefined) {
        moduleConfigList.forEach(item => updateByKeyLevel(moduleConfig, item));
        return moduleConfig;
    }
    moduleConfigList
        .filter(c => c.userId === null && c.groupId === null)
        .forEach(item => updateByKeyLevel(moduleConfig, item));
    if (options?.userId === undefined && options?.groupId === undefined) {
        return moduleConfig;
    }

    // 单聊配置
    if (options?.userId !== undefined && options?.groupId === undefined) {
        // 用户配置
        moduleConfigList
            .filter(c => c.userId !== null && c.userId === options.userId && c.groupId === null)
            .forEach(item => updateByKeyLevel(moduleConfig, item));
        return moduleConfig;
    }

    moduleConfigList
        .filter(c => c.userId === null && c.groupId !== null && c.groupId === options.groupId)
        .forEach(item => updateByKeyLevel(moduleConfig, item));
    if (options?.userId === undefined && options?.groupId !== undefined) {
        // 群配置
        return moduleConfig;
    } else if (options?.userId !== undefined && options?.groupId !== undefined) {
        // 群内用户配置
        moduleConfigList
            .filter(c => c.userId !== null && c.userId === options.userId && c.groupId !== null && c.groupId === options.groupId)
            .forEach(item => updateByKeyLevel(moduleConfig, item));
    } else {
        throw new Error("get config failure");
    }
    return moduleConfig;
}

/**
 * 通过 key 层级更新配置表
 * @param target 更新目标
 * @param conf 配置
 */
function updateByKeyLevel(target: IModuleConfig, conf: SysModuleConfig) {
    if (target[conf.sysModuleId] === undefined) {
        target[conf.sysModuleId] = {};
    }
    let value = ConfigTypeProcessor[asEnum(ConfigType, conf.type as any)](conf.value);
    let keys = conf.key.split('.').filter(k => k.trim().length > 0);
    let layerLast = undefined;
    for (let i = keys.length - 1; i >= 0; i--) {
        if (layerLast === undefined) {
            layerLast = { [keys[i]]: value };
        } else {
            layerLast = { [keys[i]]: layerLast };
        }
    }
    target[conf.sysModuleId] = mergeDeep(target[conf.sysModuleId], layerLast);
}