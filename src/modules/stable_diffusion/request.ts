import axios, { AxiosInstance } from 'axios';
import { IWechatWebRequestService } from '../../config';

export class StableDiffusionServiceFactory {
    public static createService(config: IWechatWebRequestService): AxiosInstance {
        const service = axios.create({
            baseURL: config.baseUrl,
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 300_000 // request timeout
        });
        
        service.interceptors.request.use(
            cfg => {
                return cfg;
            },
            error => {
                // do something with request error
                console.log(error); // for debug
                return Promise.reject(error);
            }
        );
        
        service.interceptors.response.use(
            response => {
                return response;
            },
            error => {
                console.log('err ' + error); // for debug
                return Promise.reject(error);
            }
        );
        return service;
    }
}

export class ImageSendServiceFactory {
    public static createService(config: IWechatWebRequestService): AxiosInstance {
        const service = axios.create({
            baseURL: config.baseUrl,
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 10_000 // request timeout
        });
        
        service.interceptors.request.use(
            cfg => {
                return cfg;
            },
            error => {
                // do something with request error
                console.log(error); // for debug
                return Promise.reject(error);
            }
        );
        
        service.interceptors.response.use(
            response => {
                return response;
            },
            error => {
                console.log('err ' + error); // for debug
                return Promise.reject(error);
            }
        );
        return service;
    }
}