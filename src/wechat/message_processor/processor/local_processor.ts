import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";
import {IBaseWechatServiceConfig, IWechatConfig} from "#/config";
import {globalClient, snowflake} from "#/app";
import {ISysCallRequest, ISysCallResponse, SysCallStatusEnum} from "#system/sys_call";
import {callSysMethod} from "#system/api";
import {IWechatSendMessage, WechatMessageTypeEnum} from "#wechat/base_wechat";

export abstract class LocalWechatMessageProcessService extends BaseWechatMessageProcessService {
    protected constructor(config: IWechatConfig, serviceConfig: IBaseWechatServiceConfig) {
        super(config, serviceConfig);
    }

    /**
     * 发起系统调用方法
     * @param request 请求参数
     * @returns 返回执行结果
     */
    public async systemCall<T>(request: ISysCallRequest): Promise<ISysCallResponse<T>> {
        return await callSysMethod(globalClient[this.clientId], request).then((data) => {
            let resp: ISysCallResponse<T> = {
                body: data,
                params: undefined,
                headers: undefined,
                requestId: request.requestId,
                status: SysCallStatusEnum.SUCCESS,
            }
            return resp;
        }).catch((e: Error) => {
            let resp: ISysCallResponse<T> = {
                body: e.message,
                params: undefined,
                headers: undefined,
                requestId: request.requestId,
                status: SysCallStatusEnum.ERROR,
            }
            return resp;
        });
    }

    protected async sendMessage(message: IWechatSendMessage) {
        let client = globalClient[this.clientId];
        await client.processSendMessage(message);
    }

    protected async triggerBroadcast(sendGroups: string[], sendUsers: string[], content: string) {
        let pList: Promise<void>[] = [];
        for (let target of sendGroups) {
            let resMsg: IWechatSendMessage = {
                id: snowflake.generate().toString(),
                service: this.serviceCode,
                groupId: target,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            pList.push(this.sendMessage(resMsg));
        }
        for (let user of sendUsers) {
            let resMsg: IWechatSendMessage = {
                id: snowflake.generate().toString(),
                service: this.serviceCode,
                groupId: user,
                targetId: null,
                msgType: WechatMessageTypeEnum.TEXT,
                content: content
            }
            pList.push(this.sendMessage(resMsg));
        }
        await Promise.all(pList);
    }
}
