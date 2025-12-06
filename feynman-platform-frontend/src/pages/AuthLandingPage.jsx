// src/pages/AuthLandingPage.jsx
import { Link, useLocation } from 'react-router-dom';

function AuthLandingPage() {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  return (
    <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>需要登录</h1>
      <p style={{ textAlign: 'center', color: '#555' }}>
        当前页面为受保护内容，请登录或注册后继续访问。
      </p>
      <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#666' }}>上次尝试访问的页面：</div>
        <div style={{ fontWeight: 'bold' }}>{from}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/login" state={{ from: location.state?.from }}>
          <button className="back-btn">去登录</button>
        </Link>
        <Link to="/register" state={{ from: location.state?.from }}>
          <button className="back-btn">去注册</button>
        </Link>
      </div>
    </div>
  );
}

export default AuthLandingPage;

