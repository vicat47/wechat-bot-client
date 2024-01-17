import path from "path";
import {AxiosInstance} from "axios";

import {IWechatConfig} from "#/config";
import request from "#/utils/request";
import base_wechat from "#wechat/base_wechat";

import {IWeatherConfig} from "./config";
import {LocalWechatMessageProcessService} from "#wechat/message_processor/processor/local_processor";

export const serviceCode = path.basename(__dirname);

// let configList;
// try {
//     configList = config.get(`modules.${ path.basename(__dirname) }`) as IWeatherConfig[];
// } catch(error) {
//     console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
//     throw error;
// }


// 天气预报接口 http://aider.meizu.com/app/weather/listWeather?cityIds=101120101
interface ListWeatherDataValue {
    alarms: any[];
    city: string;
    cityid: number;
    indexes: {
        abbreviation: string;
        alias: string;
        content: string;
        level: string;
        name: string;
    }[],
    pm25: Record<string, string | number>;
    provinceName: string;
    realtime: Record<string, string>;
    weatherDetailsInfo: {
        publishTime: string;
        weather3HoursDetailsInfos: Record<string, string>[];
    };
    weathers: Record<string, string>[];
}
interface ListWeatherReq {
    code: string;
    message: string;
    redirect: string;
    value: ListWeatherDataValue[];
}

// cityIds：101120101 （济南）
async function getWeatherInfo(baseUrl: string, cityId: number) {
    try {
        const res = await request.get<ListWeatherReq>(`${ baseUrl }/weather/listWeather`, { params: { cityIds: cityId } });
        const { indexes, realtime, weathers } = res.data.value[0];
        // 气温推荐
        const { content, name, level } = indexes[getRandomIntInclusive(0, indexes.length - 1)];
        // 实时天气
        const { sendibleTemp, temp, weather: wea, wD, wS } = realtime;
        const data = {
            weathers,
            content,
            name,
            level,
            temp,
            sendibleTemp,
            wea,
            wD,
            wS
        };
        return data;
    } catch {
        throw new Error('获取天气预报异常！');
    }
}

function getRandomIntInclusive(min: number, max: number): number {
    const mi = Math.ceil(min);
    const ma = Math.floor(max);
    return Math.floor(Math.random() * (ma - mi + 1)) + mi; // 含最大值，含最小值
}

class WeatherService extends LocalWechatMessageProcessService {
    public handleNext: boolean = false;

    service?: AxiosInstance;
    serviceCode: string = serviceCode;
    constructor(clientConfig: IWechatConfig, config: IWeatherConfig) {
        super(clientConfig, config);
    }
    async canProcess(message: base_wechat): Promise<boolean> {
        return this.simpleMessageProcessorTest(message, ['天气']);
    }
    async replyMessage(message: base_wechat): Promise<string | null> {
        const {
            content,
            name,
            level,
            temp,
            sendibleTemp,
            wea,
            wD,
            wS
        } = await getWeatherInfo((this.serviceConfig as IWeatherConfig).baseUrl, (this.serviceConfig as IWeatherConfig).cityId);
        return `🌟当前温度：${temp} ℃
🌡️体感温度：${sendibleTemp} ℃
☁️气候：${wea}
🍃风：${wD} [${wS}]
${content}
[${name}：${level}]     `;
    }
    getServiceName(): string {
        return "天气服务";
    }

    getUsage(): string {
        return "回复关键字 天气"
    }

    protected async triggerSchedule(): Promise<string | null> {
        const {
            weathers,
            content,
            temp
        } = await getWeatherInfo((this.serviceConfig as IWeatherConfig).baseUrl, (this.serviceConfig as IWeatherConfig).cityId);
        const today = weathers[0];
        return `☀️早上好！
🍁今天是${today.date} ${today.week}
🌟温度 ${today.temp_day_c}℃ ~ ${today.temp_night_c}℃ ${today.weather}
🌡️当前气温 ${temp} ℃
${content}     `;
    }
}

export function register(wechatConfig: IWechatConfig, chatgptConfig: IWeatherConfig): WeatherService {
    return new WeatherService(wechatConfig, chatgptConfig);
}
// const serviceList: WeatherService[] = configList.map(c => new WeatherService(config.get("wechat_server") as IWechatConfig, c));
// export default serviceList;
