import axios, {AxiosInstance} from "axios";
import {IWechatWebRequestServiceConfig} from "#/config";

class JenkinsServiceFactory {
    public static createService(config: IWechatWebRequestServiceConfig): AxiosInstance {
        let service = axios.create({
            baseURL: config.baseUrl,
            withCredentials: true, // send cookies when cross-domain requests
            timeout: 10000 // request timeout
        });

        service.interceptors.request.use(
            cfg => {
                // do something before request is sent
                cfg.params = config.params;
                cfg.auth = config.auth;
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

export default JenkinsServiceFactory;
