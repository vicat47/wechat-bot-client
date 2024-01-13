import axios, {AxiosInstance} from "axios";
import {IBaiduThousandSailsApiConfig} from "./config";
import NodeCache from "node-cache";

export default function restServiceFactory(config: IBaiduThousandSailsApiConfig): () => AxiosInstance {
    return function(): AxiosInstance {
        let tokenCache = new NodeCache({
            stdTTL: 7200,
            checkperiod: 1200,
            useClones: false,
        });

        async function getToken(service: AxiosInstance) {
            if (tokenCache.get("baidu-thousand-sails-token") !== undefined) {
                return tokenCache.get("baidu-thousand-sails-token");
            }
            let response = await service.get<any>("/oauth/2.0/token", {
                params: {
                    "grant_type": "client_credentials",
                    "client_id": config.apiKey,
                    "client_secret": config.clientSecret,
                }
            });
            tokenCache.set("baidu-thousand-sails-token", response.data["access_token"]);
            return response.data["access_token"];
        }

        const service = axios.create({
            baseURL: config.baseUrl,
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 60_000 // request timeout
        });

        service.interceptors.request.use(
            async cfg => {
                if (cfg.url && cfg.url.includes('/token')) {
                    return cfg;
                }
                // 获取 token
                const token = await getToken(service);
                if (cfg.params === undefined) {
                    cfg.params = {}
                }
                Object.assign(cfg.params, {
                    "access_token": `${token}`,
                });
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
