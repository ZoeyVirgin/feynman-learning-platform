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

  const isAuthPage = /^\/(login|register)\b/.test(location.pathname);

  return (
    <div className="app-layout">
      {!isAuthPage && (
        <nav style={{ background: '#eee', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Link to="/" style={{ marginRight: '1rem' }}>主页</Link>

            {/* 显示用户名 */}
            {token && user && (
              <span style={{
                color: '#333',
                fontWeight: 'bold',
                marginRight: '1rem',
                fontSize: '16px'
              }}>
                欢迎，{user.username}！
              </span>
            )}
          </div>

          <div>
            {!token && (
              <>
                <Link to="/login" style={{ marginRight: '1rem' }}>登录</Link>
                <Link to="/register">注册</Link>
              </>
            )}

            {token && (
              <button onClick={handleLogout} style={{
                marginLeft: '1rem',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer'
              }}>
                退出登录
              </button>
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