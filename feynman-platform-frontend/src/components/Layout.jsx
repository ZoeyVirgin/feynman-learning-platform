import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 引入useAuth

function Layout() {
  const { token, user, logout } = useAuth(); // 拿到token、user和logout函数
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();        // 清除token和用户信息
    navigate('/login'); // 跳回登录页
  };

  const isAuthPage = /^(\/login|\/register)\b/.test(location.pathname);

  return (
    <div className="app-layout">
      {!isAuthPage && (
        <nav className="top-nav">
          <div className="nav-left">
            <Link to="/" className="nav-link">主页</Link>
            {token && user && (
              <span className="nav-username">欢迎，{user.username}！</span>
            )}
          </div>

          <div className="nav-right">
            {!token && (
              <>
                <Link to="/login" className="nav-link">登录</Link>
                <Link to="/register" className="nav-link">注册</Link>
              </>
            )}

            {token && (
              <button onClick={handleLogout} className="nav-logout">退出登录</button>
            )}
          </div>
        </nav>
      )}

      <main style={{ padding: isAuthPage ? '0' : '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
