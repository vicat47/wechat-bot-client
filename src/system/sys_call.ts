import NodeCache from "node-cache";

export enum SysCallStatusEnum {
    SUCCESS = 200,
    ERROR = 500,
}

interface ISysCallRequestHeader {
    moduleId: string;
    [key: string]: any;
}

export interface ISysCallRequest {
    body: any;
    params?: any;
    headers?: ISysCallRequestHeader;
    requestId: any;
    router: string;
}

export interface ISysCallResponse {
    body: any;
    params: any;
    headers: any;
    requestId: any;
    status: number;
}

const requestCache = new NodeCache({
    stdTTL: 30,
    checkperiod: 20,
    useClones: false,
});

requestCache.on("expired", (key, value) => {
    if (value.reject !== undefined) {
        value.reject(`request id ${ key } is expired...`);
    }
});

export function generateRequestId(wechatId: string, serviceId?: string): string {
    return `${wechatId}_${serviceId}_${String(Math.floor(Date.now()))}`;
}

export function savePromiseForRequestId(requestId: string, promise: any) {
    requestCache.set(requestId, promise);
}

export function getPromiseByRequestId(requestId: string): any {
    return requestCache.take(requestId);
}