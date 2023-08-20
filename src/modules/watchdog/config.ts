import { IWechatWebRequestService, IWechatRoomService, IWechatService } from "../../config";

export type behavior = "CALLMETHOD" | "FORWARD" | "RECORD";

export interface IWatchdogWatchParam {
    users?: string[];
    groups?: {
        id: string;
        userIds?: string[];
    }[];
}

export interface IWatchdogConfig extends IWechatService {
    watch: IWatchdogWatchParam;
    preProcessor?: string;
    regex: string;
    predicate?: string;
    behavior: behavior;
    method?: string;
    postProcessor?: string;
    forwardTargets?: string[];
}