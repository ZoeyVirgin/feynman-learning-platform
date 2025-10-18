import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 引入useAuth

function Layout() {
  const { token, logout } = useAuth(); // 拿到token和logout函数
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();        // 清除token和用户信息
    navigate('/login'); // 跳回登录页
  };

  return (
    <div className="app-layout">
      <nav style={{ background: '#eee', padding: '1rem' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>主页</Link>

        {!token && (
          <>
            <Link to="/login" style={{ marginRight: '1rem' }}>登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}

        {token && (
          <button onClick={handleLogout} style={{ marginLeft: '1rem' }}>
            退出登录
          </button>
        )}
      </nav>

      <main style={{ padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
