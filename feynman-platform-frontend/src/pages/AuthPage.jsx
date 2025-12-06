// src/pages/AuthPage.jsx
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

function AuthPage({ initialMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // 允许从路由或 props 决定初始模式
  const defaultMode = initialMode || (location.pathname.includes('/register') ? 'register' : 'login');
  const [mode, setMode] = useState(defaultMode); // 'login' | 'register'

  // 表单状态
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 左侧卡片：图片/冷知识切换
  const images = useMemo(() => {
    const modules = import.meta.glob('../assets/images/knowledge/**/*.{webp,jpg,jpeg,png}', { eager: true });
    const urls = Object.values(modules)
      .map((m) => (m && typeof m === 'object' && 'default' in m ? m.default : null))
      .filter(Boolean);
    return urls;
  }, []);
  const [showImage, setShowImage] = useState(true);
  const [imgIndex, setImgIndex] = useState(() => Math.floor(Math.random() * 1000));
  const currentImage = images.length ? images[imgIndex % images.length] : null;

  const fallbackFacts = [
    '你知道吗？键盘 QWERTY 排列源自打字机时代，为了减少卡纸几率。',
    '你知道吗？香蕉属于浆果，而草莓并不是真正的“莓”。',
    '你知道吗？在太空中没有声音，因为没有介质传递声波。',
    '你知道吗？蜂蜜几乎不会变质，考古学家曾在古墓中发现仍可食用的蜂蜜。',
    '你知道吗？章鱼有三个心脏和蓝色的血液。'
  ];
  const [fact, setFact] = useState('');
  const [isFading, setIsFading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await apiClient.post('/users/login', { email: formData.email, password: formData.password });
        login(res.data.token, res.data.user);
      } else {
        // register
        const res = await apiClient.post('/users/register', { username: formData.username, email: formData.email, password: formData.password });
        // 注册成功后直接登录
        login(res.data.token, res.data.user);
      }
      const backTo = location.state?.from?.pathname || '/';
      navigate(backTo, { replace: true });
    } catch (err) {
      const errorMsg = err?.response?.data?.msg;
      if (mode === 'login') {
        if (errorMsg === '账号不存在') setError('该邮箱未注册，请先注册账号');
        else if (errorMsg === '密码错误') setError('密码错误，请重新输入');
        else setError('登录失败，请稍后再试');
      } else {
        if (errorMsg?.includes('已存在') || errorMsg?.includes('已注册')) setError('该邮箱已注册，请直接登录');
        else setError('注册失败，请稍后再试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCard = async () => {
    setIsFading(true);
    setTimeout(async () => {
      if (showImage) {
        if (!fact) {
          try {
            const res = await apiClient.get('/knowledge/random');
            setFact(res?.data?.text || fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]);
          } catch {
            setFact(fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]);
          }
        }
      } else {
        setImgIndex((i) => i + 1);
      }
      setShowImage((v) => !v);
      setIsFading(false);
    }, 180);
  };

  const onKeyToggle = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard();
    }
  };

  const switchTo = (next) => {
    setMode(next);
    setError('');
    // 可选：清理或保留输入
    if (next === 'login') setFormData((d) => ({ username: '', email: d.email, password: '' }));
    if (next === 'register') setFormData((d) => ({ username: '', email: d.email, password: '' }));
  };

  return (
    <div className="login-page">
      <div className="login-card-wrap">
        {/* 左侧：互动图片/冷知识 */}
        <section
          className={`login-left ${isFading ? 'fade' : ''}`}
          onClick={toggleCard}
          role="button"
          tabIndex={0}
          aria-pressed={!showImage}
          onKeyDown={onKeyToggle}
        >
          <div className="login-media-box">
            {showImage ? (
              currentImage ? (
                <img src={currentImage} alt="knowledge-illustration" className="login-img" />
              ) : (
                <div className="login-img placeholder" />
              )
            ) : (
              <div className="login-fact" aria-live="polite">{fact || fallbackFacts[0]}</div>
            )}
          </div>

        </section>

        {/* 右侧：登录/注册表单 */}
        <section className="login-right">
          <h1 className="login-title">{mode === 'login' ? '欢迎回来' : '新建账号'}</h1>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="用户名"
                required
              />
            )}
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="邮箱"
              required
            />
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === 'login' ? '密码' : '设置密码'}
              required
            />
            <button type="submit" disabled={submitting}>{mode === 'login' ? '登录' : '注册'}</button>
          </form>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div className="login-links" style={{ marginTop: 12 }}>
            {mode === 'login' ? (
              <>
                <span style={{ color: '#868e96', fontSize: 12 }}>还没有账号？</span>
                <button className="back-btn" onClick={() => switchTo('register')} style={{ marginLeft: 8 }}>去注册</button>
              </>
            ) : (
              <>
                <span style={{ color: '#868e96', fontSize: 12 }}>已有账号？</span>
                <button className="back-btn" onClick={() => switchTo('login')} style={{ marginLeft: 8 }}>去登录</button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;

