// src/components/ProtectedRoute.jsx
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation(); // 保存当前路径，用于可能的返回
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    if (!token) {
      // 弹出提示
      alert('请先登录后再访问该页面！');
      // 延时设置跳转（为了避免 alert 阻塞）
      setRedirect(true);
    }
  }, [token]);

  if (redirect && !token) {
    // 跳转到登录页
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
