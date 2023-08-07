import axios, { AxiosInstance } from 'axios';
import { IWechatWebRequestService } from '../../config';
// import { IChatGPTReply } from './api';
// import configList from './config';

class RestServiceFactory {
    public static createService(config: IWechatWebRequestService): AxiosInstance {        
        const service = axios.create({
            baseURL: config.baseUrl,
            // withCredentials: true, // send cookies when cross-domain requests
            timeout: 60_000 // request timeout
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

export default RestServiceFactory;
// (async () => { 
//     let config = configList[0];
    
//     let res = await RestServiceFactory.createService(config).post<IChatGPTReply>('', {
//         model: config.module,
//         messages: [
//             {
//                 role: "system",
//                 content: config.prompt
//             },
//             {
//                 role: "user",
//                 content: "aabbccddeeffg"
//             }
//         ],
//         temperature: 0.7
//     }).then(res => res.data)
//     console.log(res)
// })();