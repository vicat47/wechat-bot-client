import {IWechatConfig} from "#/config";
import BaseWechatMessage, {IWechatSendMessage, SystemMessageTypeEnum, WechatMessageTypeEnum} from "#wechat/base_wechat";
import {IBaseContentMessage, IGroupUserContent, IGroupUserNickContent, IUserContent} from "#wechat/data";
import {callSysMethod} from "#/system/api";
import {getPromiseByRequestId, ISysCallRequest, ISysCallResponse, SysCallStatusEnum} from "#system/sys_call";
import {delay} from "#/utils/tool";
import {MessagePublisherManager} from "#wechat/message_publisher/manager";
import {BaseWechatMessageProcessService} from "#wechat/message_processor/base_processor";
import {snowflake} from "#/app";
import {publisherType} from "#wechat/message_publisher/publisher/factory";


export abstract class BaseWechatClient {
    public readonly id: string;
    public readonly name: string;
    protected config: IWechatConfig;
    private msgSendQueue: {
        resolve: any;
        reject: any;
    }[] = [];
    private readonly serviceProcessorChain: BaseWechatMessageProcessService[] = [];

    protected readonly messagePublisherManager: MessagePublisherManager;

    abstract toWechatMessage(message: any): BaseWechatMessage;

    abstract sendTxtMsg(content: string, target: string): Promise<any>;

    abstract getUserList(): Promise<IBaseContentMessage<IUserContent>>;

    abstract getGroupUserList(): Promise<IBaseContentMessage<IGroupUserContent>>;

    abstract getGroupUserNick(groupId: string, userId: string): Promise<IBaseContentMessage<IGroupUserNickContent>>;

    abstract getMe(): Promise<any>;

    abstract onClose(): void;

    abstract onMessage(): (data: any) => Promise<void>;

    protected constructor(config: IWechatConfig) {
        this.id = config.id;
        this.name = config.name;
        this.config = config;
        this.sendMessageWorker();
        let typeList: publisherType[] = [];
        if (config.mqttUrl?.length > 0) {
            typeList.push('mqtt');
        } else {
            typeList.push('disabled');
            console.warn('外部消息转发已禁用，外部将不会收到消息');
        }
        this.messagePublisherManager = new MessagePublisherManager(typeList, config, this);
    }

    public async registryMessageProcessServices(...services: BaseWechatMessageProcessService[]) {
        this.serviceProcessorChain.push(...services);
        const promises = this.serviceProcessorChain.map(async service => {
            return {id: service.serviceId, priority: parseInt(await service.getPriority()), service};
        });
        const serviceWithPriorities = await Promise.all(promises);
        this.serviceProcessorChain.sort((a, b) => {
            const priorityA = serviceWithPriorities.find(item => item.id === a.serviceId)?.priority || 0;
            const priorityB = serviceWithPriorities.find(item => item.id === b.serviceId)?.priority || 0;
            return priorityA - priorityB;
        });
    }

    /**
     * <h1>本地消息处理器</h1>
     * 用于处理子类收到的微信消息，本地使用。
     * @param message 收到的微信消息
     */
    public async processReceivedMessage(message: BaseWechatMessage) {
        await this.messagePublisherManager.forward(message);
        for (let service of this.serviceProcessorChain) {
            if (!(await service.canProcess(message))) {
                continue;
            }
            let replyMessage = await service.replyMessage(message);
            if (replyMessage !== null) {
                await this.processSendMessage({
                    id: snowflake.generate().toString(),
                    service: service.serviceCode,
                    groupId: message.groupId,
                    targetId: message.senderId,
                    msgType: WechatMessageTypeEnum.TEXT,
                    content: replyMessage,
                });
            }
            if (!service.handleNext) {
                break;
            }
        }
    }

    public async processSendMessage(wechatMessage: IWechatSendMessage) {
        // TODO: 校验参数。
        if (wechatMessage.msgType === WechatMessageTypeEnum.TEXT) {
            let item: any = {};
            let p = new Promise((resolve, reject) => {
                item.resolve = resolve;
                item.reject = reject;
            }).then(() => {
                return this.sendTxtMsg(wechatMessage.content, wechatMessage.groupId ?? wechatMessage.targetId ?? '');
            });
            this.msgSendQueue.push(item);
            return await p;
        }
    }

    public processSysCallMessage(request: ISysCallRequest) {
        // 处理请求
        callSysMethod(this, request)
            .then((data) => {
                let resp: ISysCallResponse<any> = {
                    body: data,
                    params: undefined,
                    headers: undefined,
                    requestId: request.requestId,
                    status: SysCallStatusEnum.SUCCESS,
                }
                return resp;
                // this.mqttClient.publish(`wechat/${this.id}/receive/sys`, JSON.stringify(resp));
            }).then((resp) => {
            this.messagePublisherManager.send({
                type: SystemMessageTypeEnum.SYSCALL_RESPONSE_MESSAGE,
                data: resp
            });
        }).catch((e: Error) => {
            let resp: ISysCallResponse<string> = {
                body: e.message,
                params: undefined,
                headers: undefined,
                requestId: request.requestId,
                status: SysCallStatusEnum.ERROR,
            }
            this.messagePublisherManager.send({
                type: SystemMessageTypeEnum.SYSCALL_RESPONSE_MESSAGE,
                data: resp
            });
            // this.mqttClient.publish(`wechat/${this.id}/receive/sys`, JSON.stringify(resp));
        });
    }

    public processSysCallReceiveMessage(response: ISysCallResponse<any>) {
        const requestId = response.requestId;
        const promise = getPromiseByRequestId(requestId);
        if (promise) {
            promise.resolve(response); // Resolve the promise with the system response
        }
    }

    protected async connect(): Promise<void> {
        // TODO: 这里注意如果 mqtt 连接太快会有问题
        await this.messagePublisherManager.init();
    }

    private async sendMessageWorker() {
        // TODO: 替换为真正的 worker
        console.log("消息处理线程已启动");
        while (true) {
            let item = this.msgSendQueue.shift();
            item?.resolve();
            await delay(1000);
        }
    }

}
