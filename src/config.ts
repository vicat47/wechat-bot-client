import {AxiosProxyConfig} from "axios";

export enum StrBoolEnum {
  TRUE = "1",
  FALSE = "0"
}

export interface IWechatConfig {
  clientType: 0 | 1;
  webSocketUrl: string;
  httpUrl: string;
  mqttUrl: string;
  name: string;
  id: string;
}

export interface IBaseWechatServiceConfig {
  id: string;
  /**
   * 在群组中是否为默认服务
   *   0 - 不是
   *   1 - 是
   */
  default?: '0' | '1';
}

export interface IWechatRoomServiceConfig extends IBaseWechatServiceConfig {
  attachedRoomId: string[];
  singleContactWhiteList?: string[];
}

export interface IWechatBroadcastServiceConfig extends IBaseWechatServiceConfig {
  broadcastRoomIds: string[];
}

export interface IWechatWebRequestServiceConfig extends IBaseWechatServiceConfig {
  baseUrl: string;
  auth?: any;
  headers?: any;
  params?: any;
  proxy?: AxiosProxyConfig;
}

export interface ISubscriptionsMessageServiceConfig extends IWechatRoomServiceConfig, IWechatBroadcastServiceConfig {
  subscriptionId: string;
  content_selector: string;
  localFileName?: string;
  keywordsWhiteList?: string[];
}
