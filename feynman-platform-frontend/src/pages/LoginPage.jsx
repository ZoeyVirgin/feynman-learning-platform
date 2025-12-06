// src/pages/LoginPage.jsx
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // 表单状态
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // 左侧卡片：图片/冷知识切换
  const images = useMemo(() => {
    // 自动收集所有插画资源（随机命名也可）
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
    try {
      const response = await apiClient.post('/users/login', formData);
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      const errorMsg = err?.response?.data?.msg;
      if (errorMsg === '账号不存在') setError('该邮箱未注册，请先注册账号');
      else if (errorMsg === '密码错误') setError('密码错误，请重新输入');
      else setError('登录失败，请稍后再试');
    }
  };

  // 点击卡片切换内容（带淡入淡出）
  const toggleCard = async () => {
    setIsFading(true);
    setTimeout(async () => {
      if (showImage) {
        // 切到文本，若暂无 fact 则请求一条
        if (!fact) {
          try {
            const res = await apiClient.get('/knowledge/random');
            setFact(res?.data?.text || fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]);
          } catch {
            setFact(fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]);
          }
        }
      } else {
        // 切回图片时，顺带显示下一张随机图
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
          <div className="login-tip">{showImage ? '点击查看冷知识' : '点击查看插画'}</div>
        </section>

        {/* 右侧：登录表单（整合到同一白卡中） */}
        <section className="login-right">
          <h1 className="login-title">欢迎回来</h1>
          <div className="login-subtitle">便捷・智能・个性化</div>

          <form onSubmit={handleSubmit}>
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
              placeholder="密码"
              required
            />
            <button type="submit">登录</button>
          </form>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="login-links" style={{ marginTop: 12 }}>
            <span style={{ color: '#868e96', fontSize: 12 }}>还没有账号？</span>
            <button className="back-btn" onClick={() => navigate('/register')} style={{ marginLeft: 8 }}>去注册</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
