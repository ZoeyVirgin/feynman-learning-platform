import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);

    const login = (newToken) => {
        setToken(newToken);
        localStorage.setItem('token', newToken); // ✅ 把 token 存入 localStorage
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token'); // ✅ 同时清理 localStorage
    };


    const value = { token, user, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义 Hook，方便使用
export function useAuth() {
    return useContext(AuthContext);
}
