import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'));  // 保存token
    const [user, setUser] = useState(() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null; // 保存用户信息
        } catch (error) {
            console.error('Error parsing user data from localStorage:', error);
            localStorage.removeItem('user'); // 清除损坏的数据
            return null;
        }
    });
    const [isAuthReady, setIsAuthReady] = useState(false);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // 添加token验证函数
    const verifyToken = async () => {
        try {
            const response = await apiClient.get('/users/verify');
            setUser(response.data.user);
            return true;
        } catch (error) {
            // token无效，清除本地数据
            console.warn('Token 验证失败:', error?.response?.data?.msg || error.message);
            logout();
            return false;
        }
    };

    // 在组件初始化或 token 变化时验证token，并标记鉴权就绪
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            if (token) {
                try {
                    await verifyToken();
                } finally {
                    if (mounted) setIsAuthReady(true);
                }
            } else {
                if (mounted) setIsAuthReady(true);
            }
        };
        setIsAuthReady(false);
        check();
        return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const value = { token, user, login, logout, isAuthReady };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义 Hook，方便使用
export function useAuth() {
    return useContext(AuthContext);
}