import {IWechatWebRequestServiceConfig} from "#/config";

export interface IBaiduThousandSailsApiConfig extends IWechatWebRequestServiceConfig {
    apiKey: string;
    clientSecret: string;
}
