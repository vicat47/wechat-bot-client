import { IWechatWebRequestService, IWechatRoomService } from "../../config";
import { IDatasourceConfig } from "../../data_source";

export interface IChatGPTConfig extends IWechatRoomService, IWechatWebRequestService {
    prompt?: string;
    module: string;
    memory: number;
    datasource?: IDatasourceConfig;
}