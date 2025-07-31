import {IWechatWebRequestServiceConfig} from "#/config";
import axios, {AxiosInstance} from "axios";

export default function restServiceFactory(config: IWechatWebRequestServiceConfig): () => AxiosInstance {
    return function (): AxiosInstance {
        const service = axios.create({
            baseURL: config.baseUrl,
            timeout: 120_000 // request timeout
        });

        service.interceptors.request.use(
            cfg => {
                // cfg.headers.setAuthorization(`Bearer ${config.auth.token}`);
                // cfg.proxy = config.proxy;
                return cfg;
            },
            error => {
                console.error(error);
                return Promise.reject(error);
            }
        );

        service.interceptors.response.use(
            response => response,
            error => {
                console.error(error.response?.data || error.message);
                return Promise.reject(error);
            }
        );
        return service;
    };
}
