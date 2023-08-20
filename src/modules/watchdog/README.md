# 看门狗模块

## 概述

该模块主要用于监视群内指定消息，然后选择行为的模块。

## 配置

配置使用 `sys_module_config` 表

用户 ID 的配置项含义为： 监听该用户消息

群组 ID 的配置项含义为： 监听群消息

若两者都有则监听群内具体用户消息

| 配置键          | 必填 | 配置值                     | 值类型 | 备注                                                         |
| --------------- | ---- | -------------------------- | ------ | ------------------------------------------------------------ |
| watch           | ✅   | 监视哪个群哪个用户         | json   | {"users": ["userId"], "groups": [{"id": "groupId", "userIds": ["userId1"]}]} |
| preProcessor   |      | （js 代码）消息预处理器    | string | 通过 **Function** 实现动态方法调用（预留，暂不实现）         |
| regex           | ✅    | 正则                       | string | 正则表达式，判断，捕获消息分组                               |
| predicate       |      | （js 代码）消息判断器      | string | 用于正则判断不满足的情况，与正则为二选一关系（预留，暂不实现） |
| behavior        | ✅    | 行为枚举                   | string | FORWARD=转发到指定群/用户<br />RECORD=记录（预留，暂不实现）<br />CALLMETHOD=方法调用（预留，暂不实现） |
| method          |      | 行为的 method              | string | 当 behavior = CALLMETHOD 时通过 **Function** 实现动态方法调用（预留，暂不实现） |
| postProcessor  |      | 消息后置处理器             | string | 消息发送前的处理器，通过 **Function** 实现动态方法调用       |
| forwardTargets |      | ["转发目标1", "转发目标2"] | string | 当  behavior=FORWARD 时生效，转发给目标                      |

## 流程

1. 获取模块所有配置
2. 通过用户 id 与群 id 监听
3. 调用 preProcessor 处理消息
4. 通过 正则/predicate 判断消息是否该执行
5. 通过 postProcessor 处理接收到的消息
6. 通过 method/forwardTargets 进行消息转发
