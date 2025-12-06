// src/components/ProtectedRoute.jsx
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

function ProtectedRoute() {
  const { token, isAuthReady } = useAuth();
  const location = useLocation();

  // 鉴权未就绪时不渲染，防止闪烁或误判
  if (!isAuthReady) return null;

  // 未认证：静默跳转到展示页 /welcome，并带上来源
  if (!token) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }

  // 认证通过：正常渲染受保护内容
  return <Outlet />;
}

export default ProtectedRoute;
