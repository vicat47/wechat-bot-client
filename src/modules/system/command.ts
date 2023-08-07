import { SysGroup } from "../../entity/SysGroup";
import { SysUser } from "../../entity/SysUser";
import { SysUserGroup } from "../../entity/SysUserGroup";
import { SysCallMethodEnum } from "../../system/api";
import BaseWechatMessage, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";

enum Command {
    UDPATE_USER = "/update_user",
    UPDATE_GROUP_USER = "/update_group"
}

/**
 * 定义系统 Command 类型
 * 注册一个函数
 */
type SysCommandType = {
    [k in Command]: (service: BaseWechatMessageProcessService, message: BaseWechatMessage, content: string) => Promise<any>;
}

export function getCommand(message: string): Command | undefined {
    if (message.startsWith(Command.UDPATE_USER)) {
        return Command.UDPATE_USER;
    } else if (message.startsWith(Command.UPDATE_GROUP_USER)) {
        return Command.UPDATE_GROUP_USER;
    } else {
        return undefined;
    }
}

/**
 * 更新用户命令
 * @param message 实际的消息对象
 * @param content 消息的内容
 */
async function updateUser(service: BaseWechatMessageProcessService, message: BaseWechatMessage, content: string): Promise<string | null> {
    let result = await service.systemCall({
        body: undefined,
        requestId: undefined,
        router: SysCallMethodEnum.syncUserList,
    });
    if (result.status === 200) {
        let body = result.body as [SysUser[], SysGroup[]]
        return `用户同步成功，共新增 ${body[0].length} 条用户， ${body[1].length} 个群`;
    } else {
        return "命令执行失败";
    }
}

async function updateGroupUser(service: BaseWechatMessageProcessService, message: BaseWechatMessage, content: string) {
    let result = await service.systemCall({
        body: undefined,
        requestId: undefined,
        router: SysCallMethodEnum.syncGroupUser,
    });
    if (result.status === 200) {
        let body = result.body as [SysUserGroup[]]
        return `用户同步成功，共添加 ${body.length} 条数据`;
    } else {
        return "命令执行失败";
    }
}

export const commandFunctions: SysCommandType = {
    [Command.UDPATE_USER]: updateUser,
    [Command.UPDATE_GROUP_USER]: updateGroupUser,
}