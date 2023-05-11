import { AxiosInstance } from "axios";
import dayjs from "dayjs";
import getFutureHolidayString from "../../utils/holiday";
import base_wechat, { BaseWechatMessageProcessService } from "../../wechat/base_wechat";
import { IFishConfig } from "./config";
import config from "config";

let configList;
try {
    configList = config.get("modules.fishtouch") as IFishConfig[];
} catch(error) {
    console.warn("获取模块配置 modules.fishtouch 出错！")
    throw error;
}

const weekdays: {
    label: string;
    value: string;
}[] = [
        {
            label: 'Monday',
            value: '星期一'
        },
        {
            label: 'Tuesday',
            value: '星期二'
        },
        {
            label: 'Wednesday',
            value: '星期三'
        },
        {
            label: 'Thursday',
            value: '星期四'
        },
        {
            label: 'Friday',
            value: '星期五'
        },
        {
            label: 'Saturday',
            value: '星期六'
        },
        {
            label: 'Sunday',
            value: '星期日'
        }
    ];


type Days = (
    future: string,
    unit: 'minute' | 'hour' | 'day',
    now?: Date
) => number;

// future 未来时间 unit 时间单位
const difference: Days = function (future, unit, now = new Date()) {
    return dayjs(future).diff(dayjs(now), unit);
};

// 计算剩余天数
const remainingDays: Days = function (future, unit, now = new Date()) {
    return difference(future, unit, now) + 1;
};

function getCurrentTime(): {
    date: string;
    time: string;
} {
    const Date: string = dayjs().format('YYYY-MM-DD');
    const Time: string = dayjs().format('HH:mm');
    return {
        date: Date,
        time: Time
    }
}

async function leaveWorkMsg() {
    return '各部门请注意，下班时间到了！！！请滚，不要浪费电费！\n[Doge] over';
}

class FishTouchService extends BaseWechatMessageProcessService {
    service?: AxiosInstance;
    config: IFishConfig;
    serviceCode: string = "fish-touch-service";
    constructor(config: IFishConfig) {
        super();
        this.config = config;
    }
    canProcess(message: base_wechat): boolean {
        return BaseWechatMessageProcessService.simpleMessageProcessorTest(message, ['摸鱼']);
    }
    async replyMessage(message: base_wechat): Promise<string | null> {
        return await this.fishTouchMsg();
    }
    getServiceName(): string {
        return "摸鱼服务";
    }
    getUseage(): string {
        return "发送指令 摸鱼 实现。"
    }
    getTopics(): string[] {
        let topicList = [];
        topicList.push(...this.config.attachedRoomId.map(roomId => {
            return `wechat/${ config.get("wechat_server.id") }/receve/groups/${ roomId }/#`
        }));
        for (let adminUser of (config.get("admin") as string).split(/\s*,\s*/)) {
            topicList.push(`wechat/${ config.get("wechat_server.id") }/receve/users/${ adminUser }/#`);
        }
        return topicList;
    }
    private isWorkingTime(): boolean {
        const { date, time } = getCurrentTime();
        const isAfter: boolean = dayjs(`${date} ${time}`).isAfter(
            dayjs(`${date} ${this.config.workStartTime}`)
        );
        const isBefore: boolean = dayjs(`${date} ${time}`).isBefore(
            dayjs(`${date} ${this.config.workEndTime}`)
        );
        return isAfter && isBefore;
    }

    private isDrinkingTime(): boolean {
        const { date, time } = getCurrentTime();
        const isAfter: boolean = dayjs(`${date} ${time}`).isAfter(
            dayjs(`${date} ${this.config.drinkStartTime}`)
        );
        const isBefore: boolean = dayjs(`${date} ${time}`).isBefore(
            dayjs(`${date} ${this.config.drinkEndTime}`)
        );
        return isAfter && isBefore;
    }

    async fishTouchMsg(): Promise<string> {
        if (!this.isWorkingTime()) {
            return '别摸了，都没上班摸啥鱼';
        }
        const curDate = dayjs().format('MM-D-dddd-A'); // 当前日期
        const arrDate = curDate.split('-');
        const [m, d, week, daylong] = arrDate;
        const month = Number(m);
        const day = Number(d);
        const year = dayjs().year();
        const weekCn = weekdays.find(item => item.label === week)?.value;
        const weekDays = 5 - dayjs().day(); // 周几
        const futureHolidayString = await getFutureHolidayString();
        // 发工资时间
        let salary: number;
        if (month === 12) {
            salary =
                day > this.config.payDay
                    ? remainingDays(`${year + 1}-1-${this.config.payDay}`, 'day')
                    : remainingDays(`${year}-12-${this.config.payDay}`, 'day');
        } else {
            salary =
                day > this.config.payDay
                    ? remainingDays(`${year}-${month + 1}-${this.config.payDay}`, 'day')
                    : remainingDays(`${year}-${month}-${this.config.payDay}`, 'day');
        }
        // 饮茶时间
        if (this.isDrinkingTime()) {
            return `【摸鱼办】提醒您：
💃佳人们，现在是饮茶时间！都从椅子上起来开始舞动吧！`
        }
    
        // 下班时间
        const workEndHour = difference(
            `${year}-${month}-${day} ${this.config.workEndTime}`,
            'hour'
        );
        const workEndMinute =
            difference(`${year}-${month}-${day} ${this.config.workEndTime}`, 'minute') % 60;
    
        return `【摸鱼办】提醒您：
🍁今天是${month}月${day}日 ${weekCn}
👨‍💻${daylong === 'AM' ? '上午' : '下午'}好摸鱼人！工作再累，一定不要忘记喝水哦！希望此刻看到消息的人可以和我一起来喝一杯水。及时排便洗手，记得关门。一小时后我会继续提醒大家喝水，和我一起成为一天喝八杯水的人吧！
══════════
🚇距离下班还有：${workEndHour}小时${workEndMinute}分钟
🎮距离周末还有：${weekDays}天
💰距离发工资还有：${salary}天${futureHolidayString ? '\n' + futureHolidayString : '\n'}══════════
有事没事起身去茶水间，去厕所，去廊道走走别老在工位上坐着。上班是帮老板赚钱，摸鱼是赚老板的钱！最后，祝愿天下所有摸鱼人，都能愉快的渡过每一天！     `;
    }
}

const serviceList: FishTouchService[] = configList.map(c => new FishTouchService(c));
export default serviceList;