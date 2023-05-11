import { AxiosProxyConfig } from "axios";

export interface IWechatConfig {
  webSocketUrl: string;
  httpUrl: string;
  mqttUrl: string;
  name: string;
  id: string;
}

export interface WechatRoomMsg {
  attachedRoomId: string[];
  singleContactWhiteList?: string[];
}

export interface WechatBoardcastMsg {
  boardcastRoomIds: string[];
}

export interface IWebServiceConfig {
  baseUrl: string,
  auth?: any
  headers?: any
  params?: any
  proxy?: AxiosProxyConfig
}

export interface ISubscriptionsMessageConfig extends WechatRoomMsg, WechatBoardcastMsg {
  subscriptionId: string
  content_selector: string
  localFileName?: string
  keywordsWhiteList?: string[]
}