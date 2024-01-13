import axios, {AxiosInstance} from "axios";
import {IWechatWebRequestServiceConfig} from "#/config";

export default function restServiceFactory(config: IWechatWebRequestServiceConfig): () => AxiosInstance {
    return function(): AxiosInstance {
        const service = axios.create({
            baseURL: config.baseUrl,
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 120_000 // request timeout
        });

        service.interceptors.request.use(
            cfg => {
                cfg.headers = {
                    Authorization: `Bearer ${config.auth.token}`
                }
                cfg.proxy = config.proxy
                return cfg;
            },
            error => {
                console.log(error.text())
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
                console.log(error.response.data)
                console.log('err ' + error); // for debug
                return Promise.reject(error);
            }
        );
        return service;
    }
}
