import { IWechatWebRequestService, IWechatRoomService } from "../../config";

export interface IStableDiffusionConfig extends IWechatRoomService {
    stableService: IWechatWebRequestService;
    imageService: IWechatWebRequestService;
}