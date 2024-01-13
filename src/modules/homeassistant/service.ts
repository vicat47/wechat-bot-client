import path from "path";

import base_wechat from "#wechat/base_wechat";
import {IWechatConfig} from "#/config";
import {getClientName} from "#system/sys_config";

import serviceFactory from "./request";

import {HomeAssistantSensorType, IHomeAssistantConfig} from "./config";
import {IHomeAssistantState, IHumidityAttribute, IPM25Attribute, ITemperatureAttribute} from "./api";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";


export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get("modules.homeassistant") as IHomeAssistantConfig[];
// } catch(error) {
//     console.warn("获取模块配置 modules.homeassistant 出错！")
//     throw error;
// }


class HomeAssistantService extends LocalWechatMessageProcessService {
    public readonly handleNext = false;
    public readonly serviceCode: string = serviceCode;
    private readonly service;

    constructor(clientConfig: IWechatConfig, config: IHomeAssistantConfig) {
        super(clientConfig, config);
        this.service = serviceFactory.createService(config);
    }

    async canProcess(message: base_wechat): Promise<boolean> {
        if (typeof message.content !== 'string') {
            return false;
        }
        if (message.groupId !== null && `@${getClientName(this.clientId)} `.indexOf(message.content) < 0) {
            return false;
        }
        let content = message.content.replace(`@${getClientName(this.clientId)} `, '').trim();
        if (content === '空气质量' || content === '湿度' || content === '温度') {
            return true;
        }
        return false;
    }

    async replyMessage(message: base_wechat): Promise<string | null> {
        let receivedMsg = message.content as string;
        receivedMsg = receivedMsg.replace(`@${getClientName(this.clientId)} `, '').trim();
        if (receivedMsg === '空气质量') {
            let deviceId = (this.serviceConfig as IHomeAssistantConfig).sensor.find(sensor => sensor.type === HomeAssistantSensorType.PM25)?.device_id
            return await this.getPM25DataAsMsg(deviceId ?? '');
        }
        if (receivedMsg === '湿度') {
            let deviceId = (this.serviceConfig as IHomeAssistantConfig).sensor.find(sensor => sensor.type === HomeAssistantSensorType.HUMIDITY)?.device_id
            return await this.getHumidityDataAsMsg(deviceId ?? '');
        }
        if (receivedMsg === '温度') {
            let deviceId = (this.serviceConfig as IHomeAssistantConfig).sensor.find(sensor => sensor.type === HomeAssistantSensorType.TEMPERATURE)?.device_id
            return await this.getTemperatureDataAsMsg(deviceId ?? '');
        }
        return null;
    }

    getServiceName(): string {
        return "home assistant 服务";
    }

    getUsage(): string {
        return "home assistant 服务，请输入关键字： 空气质量、温度、湿度";
    }

    async getPM25Data(deviceId: string) {
        try {
            const res = await this.service.get<IHomeAssistantState<IPM25Attribute>>(`${(this.serviceConfig as IHomeAssistantConfig).statePath}${deviceId}`);
            return await Promise.resolve(res.data);
        } catch {
            return await Promise.reject(new Error('获取PM2.5信息异常！'));
        }
    }

    /**
     * 获取温度数据的方法
     * @param deviceId
     */
    async getTemperatureData(deviceId: string) {
        try {
            const res = await this.service.get<IHomeAssistantState<ITemperatureAttribute>>(`${(this.serviceConfig as IHomeAssistantConfig).statePath}${deviceId}`);
            return await Promise.resolve(res.data);
        } catch {
            return await Promise.reject(new Error('获取温度信息异常！'));
        }
    }

    /**
     * 获取湿度数据的方法
     * @param deviceId
     */
    async getHumidityData(deviceId: string) {
        try {
            const res = await this.service.get<IHomeAssistantState<IHumidityAttribute>>(`${(this.serviceConfig as IHomeAssistantConfig).statePath}${deviceId}`);
            return await Promise.resolve(res.data);
        } catch {
            return await Promise.reject(new Error('获取湿度信息异常！'));
        }
    }

    async getPM25DataAsMsg(deviceId: string) {
        let data = await this.getPM25Data(deviceId);
        return `家里的 PM2.5 为 ${data.state}${data.attributes.unit_of_measurement}`
    }

    async getTemperatureDataAsMsg(deviceId: string) {
        let data = await this.getTemperatureData(deviceId);
        return `家里的 PM2.5 为 ${data.state}${data.attributes.unit_of_measurement}`
    }

    async getHumidityDataAsMsg(deviceId: string) {
        let data = await this.getHumidityData(deviceId);
        return `家里的 PM2.5 为 ${data.state}${data.attributes.unit_of_measurement}`
    }
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IHomeAssistantConfig): HomeAssistantService {
    return new HomeAssistantService(wechatConfig, chatgptConfig);
}

// const serviceList: HomeAssistantService[] = configList.map(c => new HomeAssistantService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;

// 测试代码
// (async () => { console.log(await getPM25DataAsMsg('sensor.zhimi_ma4_d33c_pm25_density')) })();
