// src/api/axios.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:4500/api', // 后端基础API地址
    headers: {
        'Content-Type': 'application/json',
    },
});

// 添加请求拦截器，每次请求都会自动带上token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // 从localStorage获取token
        if (token) {
            config.headers['x-auth-token'] = token; // 添加到请求头
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;
