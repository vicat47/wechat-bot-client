import { AppDataSource } from "../data_source";
import { SysGroup } from "../entity/SysGroup";
import { SysUser } from "../entity/SysUser";
import { SysUserGroup } from "../entity/SysUserGroup";
import { chatroomRegex, subscriptionRegex } from "../wechat/base_wechat";
import { BaseWechatClient } from "../wechat/wechat_client";

const groupRepo = AppDataSource.getRepository(SysGroup);
const userRepo = AppDataSource.getRepository(SysUser);
const userGroupRepo = AppDataSource.getRepository(SysUserGroup);

/**
 * 同步用户列表
 * @param client 客户端连接
 * @returns 返回新增的用户和群组
 */
export async function syncUserList(client: BaseWechatClient): Promise<[SysUser[], SysGroup[]]> {
    let [groupRes, userRes, userList] = await Promise.all([
        groupRepo.find({cache: true}),
        userRepo.find({cache: true}),
        client.getUserList(),
    ]);
    let [groupSet, userSet] = [
        new Set(groupRes.map(item => item.id)),
        new Set(userRes.map(item => item.id)),
    ]
    let sysUser: SysUser[] = [];
    let sysGroup: SysGroup[] = [];
    for (let user of userList.content) {
        if (chatroomRegex.test(user.wxid)) {
            // 群
            if (groupSet.has(user.wxid)) {
                continue;
            }
            let g = new SysGroup();
            g.name = user.name;
            g.nickName = user.remarks;
            g.id = user.wxid;
            sysGroup.push(g)
        } else if (subscriptionRegex.test(user.wxid)) {
            // 公众号
        } else {
            // 人
            if (userSet.has(user.wxid)) {
                continue;
            }
            let u = new SysUser();
            u.name = user.name;
            u.nickName = user.remarks;
            u.userType = "0";
            u.id = user.wxid;
            sysUser.push(u);
        }
    }
    return await Promise.all([
        userRepo.save(sysUser),
        groupRepo.save(sysGroup),
    ]);
}

/**
 * 同步群中用户
 * @param client 客户端
 * @returns 返回保存后的结果
 */
export async function syncGroupUser(client: BaseWechatClient): Promise<SysUserGroup[]> {
    let [groupUserList, groupUserRes] = await Promise.all([client.getGroupUserList(), userGroupRepo.find()]);
    let groupUserSet = new Set(groupUserRes.map(item => `${item.groupId}:${item.userId}`));
    let saveUserGroups = groupUserList.content
        .flatMap(item => item.member
            .filter(member => !groupUserSet.has(`${item.room_id}:${member}`))
            .map(member => {
                let userGroup = new SysUserGroup();
                userGroup.userId = member;
                userGroup.groupId = item.room_id;
                return userGroup;
            })
        );
    return userGroupRepo.save(saveUserGroups);
}