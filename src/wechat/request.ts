import axios from "axios";

const service = axios.create({
    baseURL: '',
    withCredentials: true, // send cookies when cross-domain requests
    timeout: 10000 // request timeout
});

service.interceptors.request.use(
    config => {
        // do something before request is sent
        return config;
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
            return Promise.reject(new Error(response.data?.content || 'Error'));
        }
        return response;
    },
    error => {
        console.log('err ' + error); // for debug
        return Promise.reject(error);
    }
);

export enum HttpType {
    POST = 'POST',
    GET = 'GET',
}

export default service;