# 天气模块（weather）

## 概述

通过魅族的天气接口获取实时天气与未来几日预报，支持两种输出：

- 关键字回复：成员发送 `天气`，机器人回复当前天气概况。
- 定时播报：配置 cron 后，按计划在指定群/单聊播报当日天气。

服务名 `天气服务`，用法提示 `回复关键字 天气`（`service.ts:111-117`）。模块默认**禁用**（目录内有 `disabled.ts`，根 README 功能表中标记为 🚫）。

## 功能说明与触发方式

### 关键字回复

`canProcess` 只有一个关键字：`天气`（`service.ts:90-92`），匹配逻辑在
`simpleMessageProcessorTest`（`src/wechat/message_processor/base_processor.ts:86-100`）：

| 场景 | 消息内容 | 是否触发 | 依据 |
| --- | --- | --- | --- |
| 单聊 | `天气` | ✅ | `groupId === null` 时跳过 @ 判断，`content.trim()` 必须**完全等于**关键字 |
| 单聊 | `天气怎么样` / ` 天气 ` 前后空格 | ❌ / ✅ | 完全相等比较，`trim()` 后相等才通过 |
| 单聊 | 图片、XML 等非文本消息 | ❌ | `typeof message.content !== 'string'` 直接返回 false |
| 群聊 | `天气` 或 `@机器人 天气` | ❌（当前实现不通过，见下） | `base_processor.ts:90` 的分组判断 |

> ⚠️ **群聊关键字当前不会触发**（非配置问题，是基类实现问题）：
> `base_processor.ts:90` 写的是
> `` `@${getClientName(this.clientId)} `.indexOf(message.content) < 0 ``
> 两处叠加导致群消息恒为 false：
> 1. `getClientName` 是 `async`（`src/system/sys_config.ts:39-46`），这里没有 `await`，模板串里插进去的是 Promise，实际比较字符串是 `"@[object Promise]\u2005"`；
> 2. `indexOf` 的主语和参数写反了，只有当消息内容是 `"@[object Promise]\u2005"` 的**子串**时才可能通过（`天气` 不是）。
> 于是第 93 行的去 @ 逻辑也拿不到干净的 `天气`。
> 影响面按「该模块自己怎么处理 @」分两类（全仓 `grep -rn atRegex src`、`grep -rn getClientName src` 的结果）：
>
> | 类别 | 模块与行号 | 群聊 @ 判定 |
> | --- | --- | --- |
> | 使用 `this.atRegex`（由 `config.name` 同步构造，`base_processor.ts:37,45`），**不受该缺陷影响** | `src/modules/system/service.ts:29,33,60`、`src/modules/ai_chat/service.ts:126,129,185` | 正常 |
> | 存在同一处未 `await` 的 `getClientName` | 基类 `src/wechat/message_processor/base_processor.ts:90,93` —— 其 `simpleMessageProcessorTest` 调用方：`weather/service.ts:91`、`template/service.ts:37`、`newspaper/service.ts:49`、`fishtouch/service.ts:97`；以及各自复制该写法的 `homeassistant/service.ts:39,42,51`、`jenkins/service.ts:56,59,72`、`stable_diffusion/service.ts:63,67,80`、`template/service.ts:46` | 恒不成立 |
>
> 即 `jenkins`、`stable_diffusion` 并不在 `atRegex` 一类，它们的群聊 @ 判定同样失效；`template` 两处写法都有。
> **群里要天气，目前请用定时播报（`cronTargets` 指向群 ID）。**

命中后 `handleNext = false`（`service.ts:83`），消息处理链在此终止，后续服务不再处理该条消息（`src/wechat/clients/wechat_client.ts:113-131`）。

### 定时播报

基类在构造时读取 `cronSchedule` 与 `cronTargets`，两者**都存在**才注册任务（`base_processor.ts:161-178`）；
到点调用 `WeatherService.triggerSchedule()`（`service.ts:119-131`）取当日预报，再广播给 `cronTargets` 中的目标。
目标 ID 以 `^\d{4,15}@chatroom$` 判定为群，其余按用户处理（`src/wechat/util.ts:3-21`）。

### 输出内容

实时回复（`service.ts:104-109`）：当前温度、体感温度、气候、风向风力，外加随机一条生活指数
（`indexes` 中随机取一项，`service.ts:56`）。
定时播报（`service.ts:126-130`）：日期星期、当日昼夜温差与天气、当前气温、随机生活指数。

## 依赖的外部服务与网络要求

| 依赖 | 地址 | 说明 |
| --- | --- | --- |
| 魅族天气接口 | `GET {baseUrl}/weather/listWeather?cityIds={cityId}`（`service.ts:53`） | 代码注释给出的完整示例：`http://aider.meizu.com/app/weather/listWeather?cityIds=101120101`（`service.ts:22`），因此 `baseUrl` 应填 `http://aider.meizu.com/app` |
| 鉴权 | 无 | 该接口不需要 token；weather 也没有读取任何认证配置 |
| HTTP 客户端 | 全局 axios 实例 `#/utils/request` | `timeout: 10000`（10 秒，`src/utils/request.ts:6`），响应拦截器要求 `response.data.code === '200'`（字符串比较，`src/utils/request.ts:25`），否则以 `res.message` reject |
| 重试 / 缓存 | 无 | 每次触发都实发一次请求（`service.ts:51-74`），没有缓存层，也没有失败重试 |
| 微信协议端 | 配置项 `wechat_server`（`config/default.toml:18-30`） | 回复经 client 发送：`src/wechat/clients/wechat_client.ts:117-127` → `wechat_client.ts:134-146` → `src/wechat/clients/wechat_laozhang/wechat_laozhang_client.ts:132`（`POST /api/sendtxtmsg`）。该链路全程没有 try/catch，协议端不可达时 `post` 直接 reject，而 `src/wechat/clients/wechat_laozhang/wechat_laozhang_client.ts:177` 对 `processReceivedMessage` 未 `await` ⇒ 成为未处理 Promise rejection，表现同「接口超时」小节第 4 条（进程退出/重启），**不是**静默不发 |

网络要求：进程所在主机/容器需能直连上述天气域名出网。代理方面注意：`IWechatWebRequestServiceConfig` 虽然声明了 `proxy` / `headers` / `auth` / `params`（`src/config.ts:36-42`），
但 **weather 未读取这些字段**（`service.ts:5,53` 直接用全局实例，不传 per-request 配置），需要代理时请在运行环境层面处理。

## 配置项

### 配置从哪里来

weather 的配置**不在** `config/default.toml`（该文件没有 weather 段）。历史写法（读 `modules.weather`）在
`service.ts:13-19`、`137-138` 已被注释掉，现由框架从数据库加载：

1. `load_modules` 扫描 `src/modules` 目录，目录内有 `disabled.ts`/`disabled.js` 的模块直接跳过（`src/modules/load_modules.ts:20-31`）；
2. `registryModuleServices` 按 `serviceCode = "weather"`（目录名，`service.ts:11`）调用 `getClientModuleGlobalConfig(clientId, {moduleCode: serviceCode})`（`src/system/modules.ts:28-30`）查询 `sys_module`，过滤条件在 `src/system/sys_config.ts:134-149`：`sys_module.enable = '1'`（第 140 行）且 `client_id` 匹配当前登录微信 ID（第 141 行），得到该客户端下的每个模块实例；
3. 实例配置来自 `sys_module_config`：**配置行本身也要 `enable = '1'`** 才会被这次查询取到（`src/system/sys_config.ts:145`，`configs` 关联条件为「无任何配置行」或「`enable='1'` 的行」二者之一）；`user_id`、`group_id` 均为 NULL 的是全局配置；`key` 支持 `a.b` 点号分层；`type` 为 `string` / `number` / `json`（`number` 用 `Number(value)` 转换，`src/system/sys_config.ts:24-28`、`207-241`）；
4. 框架注入 `conf.id = sys_module.id`（`src/system/modules.ts:42`），其余键原样交给 `register(wechatConfig, config)`（`src/system/modules.ts:43`）。

因此**启用 weather 需要先在数据库建模块行**：`sys_module.code`/`name` 自定义、`module_code = 'weather'`、`client_id = 登录微信ID`、`enable = '1'`、`priority` 为排序值；
再在 `sys_module_config` 逐条插入下表中的 key，**每条都要 `enable = '1'`**（建表默认值即 `1`，`sql/data.sql:201`，注释「0: 禁用；1: 启用」见 `sql/data.sql:212`）。
配置行的 `enable` 有两种失效后果（都源自同一条 SQL 谓词 `sys_config.ts:145`）：
- 只禁用其中一行（如 `cityId`）：模块仍会实例化，但该键不进入实例配置 ⇒ `cityId` 为 `undefined`，命中关键字后抛 `获取天气预报异常！`，且**没有** `err` 前缀日志（见第 2 节）；
- 该模块实例的配置行**全部**不是 `'1'`：连 `sys_module` 行都查不出来 ⇒ 这个实例根本不会被初始化，现象与「没建模块行」相同（有 `模块 weather 已加载`、没有对应的 `服务 weather: <ID> 已初始化`）。

`sql/data.sql` 的示例数据只包含 `ai_chat`/`system`/`watchdog`，没有 weather 行。

### 模块自有配置

| 配置键 | 含义 | 必填 | 类型 | 默认值 | 代码依据 |
| --- | --- | --- | --- | --- | --- |
| `cityId` | 天气接口的 `cityIds` 参数，数字城市编码（代码注释示例 `101120101` = 济南） | ✅ | number | 无默认值；未配置时 `cityIds` 为 `undefined`，axios 会直接丢掉该参数，接口返回错误码 → 抛 `获取天气预报异常！` | `config.ts:4`、`service.ts:53,103,124` |
| `baseUrl` | `listWeather` 的访问前缀，会拼成 `{baseUrl}/weather/listWeather` | ✅ | string | 无默认值；未配置时地址变成 `undefined/weather/listWeather`，请求失败 | `src/config.ts:37`、`service.ts:53,103,124` |
| `cronSchedule` | node-schedule 的 cron 表达式，用于定时播报 | 定时播报必填 | string | 未配置（或 `cronTargets` 缺失）= 不注册定时任务 | `base_processor.ts:161-164` |
| `cronTargets` | 播报目标列表的 **JSON 字符串**，群 ID 与用户 WXID 可混填，元素两端空格会被 `trim()` | 定时播报必填 | json（`string[]`） | 同上；不是数组时构造阶段抛 `cronTargets must be an array` | `base_processor.ts:162-171` |
| `id` | 服务实例 ID，等于 `sys_module.id` | 框架注入，**请勿手填** | string | — | `src/system/modules.ts:42` |

### 继承但 weather 未使用的键（配了也不生效）

| 配置键 | 来源 | weather 中的实际状态 |
| --- | --- | --- |
| `attachedRoomId` | `IWechatRoomServiceConfig`（`src/config.ts:28`） | 未读取。`canProcess` 只做关键字比较（`service.ts:90-92`），不像 `jenkins/service.ts:52`、`system/service.ts:48` 那样校验群白名单 ⇒ **任意群都可能命中（一旦群聊触发问题解决）** |
| `singleContactWhiteList` | `src/config.ts:29` | 未读取，单聊无用户白名单 |
| `default` | `src/config.ts:24` | 未读取。该键语义是「群内默认服务」（`'1'`/`'0'`，见 `StrBoolEnum`），仅 `ai_chat` 消费（`ai_chat/service.ts:138,181`），weather 的 `canProcess` 不做该判断 ⇒ 配了无效果 |
| `auth` / `headers` / `params` / `proxy` | `src/config.ts:38-41` | 未读取，见「依赖与网络要求」 |

非模块配置、但影响 weather 行为的数据库字段：

| 字段 | 位置 | 作用 |
| --- | --- | --- |
| `priority` | `sys_module.priority` 列 | 服务链排序值，越小越先处理；`getPriority` 经系统调用 `getConfig` 取该列（`base_processor.ts:67-84`、`sys_config.ts:199-203`），取不到时按 `0` 参与排序（`wechat_client.ts:95-103`） |
| `enable` | `sys_module.enable`（`'1'`/`'0'`） | `'0'` 时该模块实例不会被加载（`src/system/sys_config.ts:140`） |
| `enable` | `sys_module_config.enable`（`'1'`/`'0'`，建表默认 `'1'`） | 只有 `'1'` 的配置行才会被 `getClientModuleConfig` 取进实例配置（`src/system/sys_config.ts:145`，列定义 `src/entity/SysModuleConfig.ts:22-23`、`sql/data.sql:201`）；某模块实例的配置行全为 `'0'` 时该实例连模块行都查不出来 |

## 启用与禁用

1. 删除（或重命名）`src/modules/weather/disabled.ts`；构建产物里对应 `out/modules/weather/disabled.js` 也要一并消失，因为 `load_modules` 在运行目录同时检测 `.ts` 与 `.js`（`load_modules.ts:21-28`）。
2. 按上节在 `sys_module` / `sys_module_config` 建好 `module_code='weather'` 的模块行与 `cityId`、`baseUrl` 配置。
3. 重启进程，启动日志确认：`模块 weather 已加载`（`src/app.ts:111`）、`服务 weather: <模块ID> 已初始化，已加载`（`src/system/modules.ts:45`）、`共启动 N 个服务`（`src/app.ts:118`）。
4. 单聊发送 `天气` 验证回复；配置了 cron 时，可先把 `cronSchedule` 设成近一分钟以验证播报链路。

## 常见失败与排查

先分层定位：**模块没加载 → 服务没实例化 → 关键字没命中 → 请求失败 → 响应解析失败**。
所有天气请求失败最终都只抛一句 `获取天气预报异常！`（`service.ts:71-73`，`catch` 吞掉了原始错误），所以必须靠下面的日志和手工复现来区分原因。

### 0. 完全无响应：先确认模块已加载

| 现象 | 结论 |
| --- | --- |
| `模块 weather 已跳过（通过 disabled.js）` | `disabled.ts`/`disabled.js` 还在，见上节步骤 1 |
| 启动日志有 `模块 weather 已加载` 但没有 `服务 weather: ... 已初始化` | `sys_module` 里没有 `module_code='weather'` 且 `enable='1'`、`client_id` 匹配的行 ⇒ 没有服务实例（过滤条件在 `src/system/sys_config.ts:134-149`，`enable` 第 140 行、`client_id` 第 141 行；`服务 ... 已初始化` 由 `src/system/modules.ts:45` 打印） |
| `模块 weather 初始化出错...` | 配置阶段抛错，常见为 `cronTargets` 不是数组或不是合法 JSON（构造实例时即执行 `registerSchedule`） |
| 有 `服务 weather: ... 已初始化`，但发 `天气` 后没有任何回复，stderr 直接抛 `Error: 获取天气预报异常！` 且**没有** `err ` 前缀的日志行 | 服务已实例化但拿到的是空配置/坏配置：`cityId`、`baseUrl` 的配置行 `enable ≠ '1'`（该谓词在 `src/system/sys_config.ts:145`，见「配置从哪里来」），或 `cityId` 的 `type` 不是 `number` 导致值为 `NaN`。接口以非 `'200'` 业务码返回时走成功分支 reject，不会打印 `err`（`src/utils/request.ts:22-26`）。按第 3 节 SQL 连 `enable`、`type` 一起核对 |
| 以上都正常但不回复 | 继续看第 4 节 |

### 1. 接口超时

特征：日志出现 `err Error: timeout of 10000ms exceeded`（由 `src/utils/request.ts:32` 的错误拦截器打印），紧接着 `获取天气预报异常！`。

排查步骤：

1. 在**同一台主机/容器内**复现请求，排除网络出口：
   `curl -sS -m 12 "<baseUrl>/weather/listWeather?cityIds=<cityId>"`，观察是否 10 秒内返回；
   容器内验证：`docker compose exec <服务名> node -e "require('axios').get('<完整URL>').then(r=>console.log(r.data.code))"`。
2. `baseUrl` 用 `https` 而出口只做 `http`、或域名需要走代理，是最常见的两类超时原因；确认代理与 DNS（weather 不支持模块级 `proxy` 配置）。
3. 与协议端/微信侧无关：超时时 `handleNext = false` 的模块已经命中，这条消息不会再被其它服务处理。
4. 偶发超时会让该条消息没有任何回复；同时注意 `replyMessage` 抛出的错误没有调用方捕获（消息链循环外没有 try/catch，`src/wechat/clients/wechat_client.ts:113-117`；客户端回调处也未 await，`src/wechat/clients/wechat_laozhang/wechat_laozhang_client.ts:177`），未处理的 Promise rejection 在 Node LTS 默认会终止进程，表现为「天气接口一超时就掉线/重启」。

### 2. 返回结构变化

魅族接口字段并非本项目控制，两类破坏点：

- **业务码不是 `200`**：响应拦截器直接以 `response.data.message` reject（`src/utils/request.ts:22-26`）。注意它比较的是**字符串** `'200'`，若接口某天返回数字 `200` 也会被判定为失败。这一类失败**不会**打印 `err ` 前缀日志（`err` 只在网络/超时等已进入 rejection 分支时打印，`src/utils/request.ts:31-33`），所以「只有 `获取天气预报异常！`、没有 `err`」通常说明请求本身发出去了、是业务码或数据结构的问题。
- **数据结构变化**：`service.ts:54` 假定 `res.data.value` 是非空数组并直接取 `value[0]`，随后解构 `indexes`、`realtime`、`weathers`。
  - `value` 为空数组或缺失 → 读 `[0]` 抛 TypeError → 被 `catch` 转成 `获取天气预报异常！`；
  - `indexes` 为空数组 → `getRandomIntInclusive(0, -1)` 取到 `undefined`，解构 `{content, name, level}` 抛错，同上；
  - `realtime` 字段改名（代码依赖 `sendibleTemp`、`temp`、`weather`、`wD`、`wS`，`service.ts:58`）→ **不报错**，但回复里出现 `undefined ℃`、`🍃风：undefined [undefined]`，这是结构变化的典型特征。

排查步骤：

1. `curl` 拿到原始 JSON，与 `service.ts:23-48` 的 `ListWeatherReq` / `ListWeatherDataValue` 定义逐字段对比：顶层需 `code`、`message`、`value[]`；`value[0]` 需 `indexes[]`（含 `content`/`name`/`level`）、`realtime`（含上述 5 个键）、`weathers[]`（播报还需 `date`、`week`、`temp_day_c`、`temp_night_c`、`weather`，`service.ts:127-128`）。
2. 确认 `code` 的类型与取值，以及 `value` 是否为非空数组。
3. 结构确实变更时，本模块文档只描述现状：需要改代码请提缺陷工单，不要靠改配置绕过。

### 3. 城市名解析失败

先明确现状：**weather 不支持按城市名查询**。`IWeatherConfig.cityId` 是 `number`（`config.ts:4`），全模块没有任何「城市名 → 城市编码」的解析逻辑；配置里写「济南」「Beijing」都不会被识别。

`sys_module_config.type` 为 `number` 时走 `Number(value)`（`sys_config.ts:27`），因此：

- 填中文城市名 → `cityId` 变成 `NaN` → 请求 `cityIds=NaN` → 接口返回错误码或空 `value` → `获取天气预报异常！` / `undefined ℃`；
- 填了不存在的编码 → 同样空 `value`，`value[0]` 抛错 → `获取天气预报异常！`；
- 漏配 `cityId` → `undefined` 被 axios 丢弃，等价于无参请求 → 失败；
- `cityId` 配置行存在但 `enable ≠ '1'` → 该键同样不进实例配置，表现与漏配完全一致（`src/system/sys_config.ts:145`）。

排查步骤：

1. 直接查库确认落库值、类型和启用状态（`enable` 必须一起看，否则「配置明明在库里但就是不生效」无法定位）：
   `SELECT id, key, value, type, enable FROM sys_module_config WHERE key IN ('cityId','baseUrl');`
   重点看 `cityId` 是否为纯数字、`type` 是否为 `number`、`enable` 是否为 `1`。
   「配了却不生效」在库里有三类原因：
   - `enable ≠ '1'`：该配置行被 `getClientModuleConfig` 的 SQL 条件排除（`src/system/sys_config.ts:145`），不会进入实例配置，效果与漏配相同；若一个模块实例的配置行**全部**不是 `'1'`，则该 `sys_module` 行整体查不出来，模块不会实例化；
   - `type ≠ 'number'` 或值不是数字：`Number(value)` 得到 `NaN`（`src/system/sys_config.ts:24-28`）；
   - `user_id`/`group_id` 不为 NULL：全局配置只取两者均为 NULL 的行（`src/system/sys_config.ts:211`）。
   顺带确认这些行挂在哪个模块实例上、该实例是否启用：
   `SELECT m.id AS module_id, m.enable AS module_enable, m.client_id, c.key, c.value, c.type, c.enable AS config_enable, c.user_id, c.group_id FROM sys_module m LEFT JOIN sys_module_config c ON c.sys_module_id = m.id WHERE m.module_code = 'weather';`
2. 用编码手动请求验证归属城市：`curl -sS "<baseUrl>/weather/listWeather?cityIds=<cityId>"`，检查 `value[0].city` / `provinceName` 是否为你期望的城市（接口本身会回显城市名，这是唯一可靠的校验手段）。
3. 城市编码来源：代码注释使用的是 9 位中国城市编码（`101120101` = 济南，`service.ts:22,50`）。本文档不提供城市名到编码的查询接口，因为代码没有该能力；请在魅族/aider 天气页面的开发者工具里检索 `listWeather?cityIds=` 请求来获取目标城市编码。
4. 需要「群里发 `天气 上海` 查上海」这类能力时，属于功能新增（要改 `canProcess` 与请求参数），请按需求工单处理，不要试图通过配置实现。

### 4. 单聊正常、群里不回复

按上文「群聊关键字当前不会触发」定位：这是 `base_processor.ts:90` 的实现问题，不是 weather 配置问题。
临时规避：用 `cronSchedule` + `cronTargets`（群 ID）做定时播报。
根因修复请提缺陷工单，且**只改基类不够**：`homeassistant`、`jenkins`、`stable_diffusion`、`template` 各自复制了同一处未 `await` 的写法（见上表行号），需要一并处理，否则这些模块的群聊 @ 仍然失效。

### 5. 一个消息收到多次回复

多为同一账号启动了多个客户端/多个模块实例（根 README「常见问题」第 1 条）。检查 `sys_module` 中是否存在多行 `module_code='weather'`、以及是否有多个进程连接同一微信 ID。

## 代码索引

| 文件 | 关注点 |
| --- | --- |
| `src/modules/weather/config.ts` | `IWeatherConfig`：仅新增 `cityId`，其余继承 `IWechatRoomServiceConfig` + `IWechatWebRequestServiceConfig` |
| `src/modules/weather/service.ts` | 关键字匹配、`listWeather` 请求与解析、实时回复文案、定时播报文案 |
| `src/modules/weather/disabled.ts` | 模块禁用标记（存在即不加载） |
| `src/wechat/message_processor/base_processor.ts` | `simpleMessageProcessorTest`（关键字与 @ 处理）、`registerSchedule`（`cronSchedule`/`cronTargets`）、`getPriority` |
| `src/utils/request.ts` | 全局 axios：10 秒超时、`code !== '200'` 判失败 |
| `src/system/modules.ts`、`src/system/sys_config.ts`、`src/entity/SysModule*.ts` | 模块与配置的数据库加载 |
| `src/modules/load_modules.ts`、`src/app.ts` | 模块扫描、禁用检测、启动与日志 |
