import axios from "axios";
import {IWechatWebRequestServiceConfig} from "#/config";

class AlApiServiceFactory {
    public static createService(config: IWechatWebRequestServiceConfig) {
        let service = axios.create({
            baseURL: config.baseUrl,
            withCredentials: true, // send cookies when cross-domain requests
            timeout: 10000 // request timeout
        });

        service.interceptors.request.use(
            cfg => {
                // do something before request is sent
                cfg.params = config.params
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
                // if the custom code is not 20000, it is judged as an error.
                if (response.status !== 200) {
                    return Promise.reject(new Error(response.statusText || 'Error'));
                }
                if (response.data.code !== 200) {
                    return Promise.reject(new Error(response.statusText || 'Error'));
                }
                return response.data;
            },
            error => {
                console.log('err ' + error); // for debug
                return Promise.reject(error);
            }
        );
        return service;
    }
}


export default AlApiServiceFactory;
