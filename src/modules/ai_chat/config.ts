import {IWechatRoomServiceConfig, IWechatWebRequestServiceConfig} from "#/config";
import {IDatasourceConfig} from "#/data_source";

export interface IAiChatServiceConfig extends IWechatWebRequestServiceConfig {
    prompt?: string;
    memory: number;
    modulePrice: any;
}

export interface IAiChatChatGptServiceConfig extends IAiChatServiceConfig {
    module: string;
}

export interface IAiChatConfig extends IWechatRoomServiceConfig, IWechatWebRequestServiceConfig {
    moduleType: string;
    datasource?: IDatasourceConfig;
}
