import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import config from "config";

interface HolidayConfig {
  api: string;
  param: HolidayApiParam;
}

interface HolidayApiParam {
  holiday_recess?: number;
  cn?: number;
  size?: number;
}

// TODO: 这里有问题
const holidayConfig = config.get("modules.chat_gpt_api") as HolidayConfig;

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore)

const service = axios.create({
  baseURL: '',
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 10000 // request timeout
});

service.interceptors.request.use(
  config => {
    // do something before request is sent
    return config;
  },
  error => {
    // do something with request error
    console.log(error); // for debug
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  response => {
    const res = response.data;
    // if the custom code is not 20000, it is judged as an error.
    if (response.status !== 200 && res.code !== 0) {
      return Promise.reject(new Error(res.msg || response.statusText || 'Error'));
    } else {
      return response;
    }
  },
  error => {
    console.log('err ' + error); // for debug
    return Promise.reject(error);
  }
);

interface Holiday {
  year: number;
  month: number;
  date: number;
  yearweek: number;
  yearday: number;
  lunar_year: number;
  lunar_month: number;
  lunar_date: number;
  lunar_yearday: number;
  week: number;
  weekend: number;
  workday: number;
  holiday: number;
  holiday_or: number;
  holiday_overtime: number;
  holiday_today: number;
  holiday_legal: number;
  holiday_recess: number;
  year_cn: string;
  month_cn: string;
  date_cn: string;
  yearweek_cn: string;
  yearday_cn: string;
  lunar_year_cn: string;
  lunar_month_cn: string;
  lunar_date_cn: string;
  lunar_yearday_cn: string;
  week_cn: string;
  weekend_cn: string;
  workday_cn: string;
  holiday_cn: string;
  holiday_or_cn: string;
  holiday_overtime_cn: string;
  holiday_today_cn: string;
  holiday_legal_cn: string;
  holiday_recess_cn: string
}

interface HolidayDataPage {
  list: Holiday[];
  page: number;
  size: number;
  total: number;
}

interface HolidayResponse {
  code: number;
  msg: string;
  data: HolidayDataPage;
}

function getHolidayList(): Promise<HolidayDataPage> {
  return service.get<HolidayResponse>(holidayConfig.api, { params: holidayConfig.param })
    .then(res => {
      return Promise.resolve(res.data.data);
    })
    .catch(() => Promise.reject(new Error('数据不见了')));
}

async function getFutureHoliday() {
  let todayInt = Number(dayjs().format('YYYYMMDD'))
  let holidayDataPage = await getHolidayList();
  let holidayDate = holidayDataPage.list.filter(value => value.date > todayInt).sort((a, b) => a.date - b.date);

  if (holidayDate.length <= 0) {
    return [];
  }
  let currentHoliday: Holiday[] = [holidayDate[0]];
  let groupHoliday: [Holiday[]] = [currentHoliday];
  for (let h of holidayDate) {
    if (currentHoliday[0].date === h.date) {
      continue;
    }
    let lastDayPlus1 = dayjs(currentHoliday[currentHoliday.length - 1].date.toString(), 'YYYYMMDD').add(1, 'day');
    let today = dayjs(h.date.toString(), 'YYYYMMDD');
    if (today.isSameOrBefore(lastDayPlus1, 'day')) {
      currentHoliday.push(h);
    } else {
      currentHoliday = [h];
      groupHoliday.push(currentHoliday);
    }
  }
  return groupHoliday;
}

async function getFutureHolidayString() {
  let holidayList = await getFutureHoliday();
  let result = '';
  for (let hList of holidayList) {
    let dayOfRest = hList.length;
    let firstDayOfHoliday = hList[0];
    let holidayName = firstDayOfHoliday?.holiday_cn;
    let firstDayOfHolidayDate = firstDayOfHoliday?.date;
    if (!firstDayOfHolidayDate) {
      continue;
    }
    let dayRemaining = dayjs(firstDayOfHolidayDate.toString(), 'YYYYMMDD').diff(dayjs(), 'day');
    result += `距离${ holidayName }还有：${dayRemaining}天(${dayOfRest})
`
  }
  return result;
}

// 测试代码
// (async () => { console.log(await getFutureHolidayString()) })();

export default getFutureHolidayString;