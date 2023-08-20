import { IWechatWebRequestService, IWechatRoomService } from "../../config";
import { IDatasourceConfig } from "../../data_source";

export interface IAiChatServiceConfig extends IWechatWebRequestService {
    prompt?: string;
    memory: number;
    modulePrice: any;
}

export interface IAiChatChatGptServiceConfig extends IAiChatServiceConfig {
    module: string;
}

export interface IAiChatConfig extends IWechatRoomService, IWechatWebRequestService {
    moduleType: string;
    datasource?: IDatasourceConfig;
}