import axios, {AxiosInstance} from "axios";
import {IWechatWebRequestServiceConfig} from "#/config";

class HomeAssistantServiceFactory {
    public static createService(config: IWechatWebRequestServiceConfig): AxiosInstance {
        const service = axios.create({
            baseURL: '',
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 10000 // request timeout
        });

        service.interceptors.request.use(
            cfg => {
                // do something before request is sent
                cfg.headers = config.headers
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

export default HomeAssistantServiceFactory;
