import { createContext, useState, useContext, useEffect } from 'react';

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
            logout();
            return false;
        }
    };

    // 在组件初始化时验证token
    useEffect(() => {
        if (token) {
            verifyToken();
        }
    }, []);

    const value = { token, user, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义 Hook，方便使用
export function useAuth() {
    return useContext(AuthContext);
}