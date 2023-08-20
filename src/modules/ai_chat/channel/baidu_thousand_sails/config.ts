import { IWechatWebRequestService } from "../../../../config";

export interface IBaiduThousandSailsApiConfig extends IWechatWebRequestService {
    apiKey: string;
    clientSecret: string;
}