import { AxiosProxyConfig } from "axios";

export interface IWechatConfig {
  webSocketUrl: string;
  httpUrl: string;
  mqttUrl: string;
  name: string;
  id: string;
}

export interface IWechatService {
  id: string;
}

export interface IWechatRoomService extends IWechatService {
  attachedRoomId: string[];
  singleContactWhiteList?: string[];
}

export interface WechatBoardcastService extends IWechatService {
  boardcastRoomIds: string[];
}

export interface IWechatWebRequestService extends IWechatService {
  baseUrl: string;
  auth?: any;
  headers?: any;
  params?: any;
  proxy?: AxiosProxyConfig;
}

export interface ISubscriptionsMessageConfig extends IWechatRoomService, WechatBoardcastService {
  subscriptionId: string;
  content_selector: string;
  localFileName?: string;
  keywordsWhiteList?: string[];
}