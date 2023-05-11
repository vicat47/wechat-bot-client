import serviceFactory from "../../alapi/request";

import fs from 'fs'
import dayjs from "dayjs";
import base_wechat, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { AxiosInstance } from "axios";
import { IMorningNewspaperConfig } from "./config";
import path from 'path'
import config from "config";

let configList;
try {
    configList = config.get(`modules.${ path.basename(__dirname) }`) as IMorningNewspaperConfig[];
} catch(error) {
    console.warn(`获取模块配置 modules.${ path.basename(__dirname) } 出错！`)
    throw error;
}

interface NewspaperData {
    date: string
    news: string[]
    weiyu: string
    image: string
    head_image: string
}

function newspaperDataFormat(newspaper: NewspaperData): string {
    let theNewsDay = dayjs(newspaper.date, 'YYYY-MM-DD').format('YYYY年MM月DD日');
    return `【📰】今天是 ${ theNewsDay }，60 秒了解世界。\n ${ newspaper.news.join('\n') }\n${ newspaper.weiyu }`
}

class NewspaperService extends BaseWechatMessageProcessService {
    config: IMorningNewspaperConfig;
    service: AxiosInstance;
    serviceCode: string = "newspaper-service";

    constructor(config: IMorningNewspaperConfig) {
        super();
        this.config = config;
        this.service = serviceFactory.createService(config);
    }

    canProcess(message: base_wechat): boolean {
        return BaseWechatMessageProcessService.simpleMessageProcessorTest(message, ["新闻"]);
    }

    replyMessage(message: base_wechat): Promise<string | null> {
        return this.getNewspaperString();
    }
    getServiceName(): string {
        return "早间新闻服务";
    }
    getUseage(): string {
        return "回复关键字 新闻"
    }
    getTopics(): string[] {
        let topicList = [];
        topicList.push(...this.config.attachedRoomId.map(roomId => {
            return `wechat/${ config.get("wechat_server.id") }/receve/groups/${ roomId }/#`
        }));
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ config.get("wechat_server.id") }/receve/users/${ adminUser }/#`);
        }
        return topicList;
    }
    
    getLocalCache(date: string): NewspaperData | undefined {
        if (this.config.localFileName === undefined) {
            return;
        }
        return JSON.parse(fs.readFileSync(`./data/${this.config.localFileName}_${date}.json`, 'utf8')) as NewspaperData;
    }
    
    saveLocalCache(newspaper: NewspaperData) {
        if (this.config.localFileName === undefined) {
            return;
        }
        try {
            fs.writeFileSync(`./data/${this.config.localFileName}_${newspaper.date}.json`, JSON.stringify(newspaper));
        } catch (err) {
            console.error(err);
        }
    }

    async getNewspaperString(): Promise<string> {
        let content;
        try {
            let localData = this.getLocalCache(dayjs().format('YYYY-MM-DD'));
            if (localData !== undefined) {
                content = newspaperDataFormat(localData);
            }
        } catch (e) {
            console.log("新闻：本地无缓存");
        }
        
        try {
            let newspaper = await this.service.get<NewspaperData>('zaobao');
            this.saveLocalCache(newspaper.data)
            content = newspaperDataFormat(newspaper.data);
        } catch (e) {
            let errMsg = (e as Error).message;
            content = errMsg;
        }
    
        if (content === undefined) {
            content = "还没有新闻呢"
        }
        return content;
    }
}

const serviceList: BaseWechatMessageProcessService[] = configList.map(config => new NewspaperService(config));
export default serviceList;