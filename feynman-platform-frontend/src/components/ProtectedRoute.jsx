import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
    const { token } = useAuth(); // 从全局状态获取 token

    // 如果没有 token，重定向到登录页
    if (!token) {
        return <Navigate to="/login" replace />;
        // replace: 替换历史记录，用户点击后退不会回到受保护页面
    }

    // 如果有 token，正常渲染子路由（通过 Outlet）
    return <Outlet />;
}

export default ProtectedRoute;
