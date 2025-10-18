import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:4500/api', // 后端API的基础路径
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;