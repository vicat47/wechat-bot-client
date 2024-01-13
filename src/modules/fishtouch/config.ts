import {IWechatBroadcastServiceConfig, IWechatRoomServiceConfig} from "#/config";
import {Rule} from "#/utils/schedule";

export interface IFishConfig extends IWechatRoomServiceConfig, IWechatBroadcastServiceConfig {
    payDay: number;
    workStartTime: string;
    workEndTime: string;
    drinkStartTime: string;
    drinkEndTime: string;
    weaRule: object;
    fishRule: Rule;
    leaveWorkRule: Rule;
    eatLaunchRule: Rule;
}
