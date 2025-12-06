// src/pages/AuthPage.jsx
import { useMemo, useRef, useState, useEffect } from 'react';
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
  const mediaRef = useRef(null);
  const imgRef = useRef(null);
  const [imageRatio, setImageRatio] = useState(null); // w/h 比例
  const [boxHeight, setBoxHeight] = useState(null);

  const fallbackFacts = [
    '你知道吗？键盘 QWERTY 排列源自打字机时代，为了减少卡纸几率。',
    '你知道吗？香蕉属于浆果，而草莓并不是真正的“莓”。',
    '你知道吗？在太空中没有声音，因为没有介质传递声波。',
    '你知道吗？蜂蜜几乎不会变质，考古学家曾在古墓中发现仍可食用的蜂蜜。',
    '你知道吗？章鱼有三个心脏和蓝色的血液。'
  ];
  const [fact, setFact] = useState('');
  const [lastFact, setLastFact] = useState('');
  const [factsPool, setFactsPool] = useState([]); // 预取池，避免重复
  const [isFading, setIsFading] = useState(false);

  const shuffle = (arr) => arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ v }) => v);

  const pickDifferent = (arr, last) => {
    if (!arr || arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    let candidate = arr[0];
    if (candidate === last) candidate = arr[1] ?? candidate;
    return candidate;
  };

  const refillFacts = async (n = 16) => {
    try {
      const res = await apiClient.get(`/knowledge?limit=${n}`);
      const texts = (Array.isArray(res.data) ? res.data : [])
        .map((x) => (typeof x === 'string' ? x : x?.text))
        .filter(Boolean);
      if (texts.length) {
        setFactsPool((prev) => shuffle([...prev, ...texts]));
      }
    } catch {
      // 失败时用本地兜底补齐
      setFactsPool((prev) => shuffle([...prev, ...fallbackFacts]));
    }
  };

  useEffect(() => {
    // 首次预取一批
    refillFacts(20);
  }, []);

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
        // 准备文本：优先使用预取池，确保不与上一条重复
        if (factsPool.length < 3) {
          await refillFacts(16);
        }
        setFactsPool((prev) => {
          let pool = prev && prev.length ? prev : shuffle([...fallbackFacts]);
          // 去重，挑选与上一次不同的项
          pool = Array.from(new Set(pool));
          const next = pickDifferent(pool, lastFact) || fallbackFacts[Math.floor(Math.random()*fallbackFacts.length)];
          setFact(next);
          setLastFact(next);
          // 消耗本次项以避免立即重复
          return pool.filter((t) => t !== next);
        });
      } else {
        // 切回图片：步进随机，减少相邻重复几率
        setImgIndex((i) => i + 1 + Math.floor(Math.random() * 3));
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

  // 根据图片比例动态计算左侧盒子高度，保证图片完整显示且整体拉长
  useEffect(() => {
    const compute = (ratio) => {
      if (!mediaRef.current) return;
      const w = mediaRef.current.clientWidth || 600;
      let h = ratio ? Math.round(w / ratio) : Math.round(window.innerHeight * 0.62);
      // 视口上限：保留上下安全间距（约 160px），避免超出无需滚动
      const viewportCap = Math.max(420, Math.floor(window.innerHeight - 160));
      h = Math.min(h, viewportCap);
      // 再次夹取到合理区间（可根据喜好微调）
      h = Math.max(480, Math.min(860, h));
      setBoxHeight(h);
    };

    compute(imageRatio);
    const onResize = () => compute(imageRatio);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [imageRatio]);

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
          <div className="login-media-box" ref={mediaRef} style={boxHeight ? { height: boxHeight } : undefined}>
            {showImage ? (
              currentImage ? (
                <img
                  ref={imgRef}
                  src={currentImage}
                  alt="knowledge-illustration"
                  className="login-img"
                  onLoad={(e) => {
                    const w = e.currentTarget.naturalWidth || 0;
                    const h = e.currentTarget.naturalHeight || 0;
                    if (w && h) setImageRatio(w / h);
                  }}
                  onError={() => setImageRatio(null)}
                />
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
            <button type="submit" className="primary-btn" disabled={submitting}>{mode === 'login' ? '登录' : '注册'}</button>
          </form>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div className="login-links" style={{ marginTop: 12 }}>
            {mode === 'login' ? (
              <>
                <span style={{ color: '#868e96', fontSize: 12 }}>还没有账号？</span>
                <button className="switch-btn" onClick={() => switchTo('register')} style={{ marginLeft: 8 }}>去注册</button>
              </>
            ) : (
              <>
                <span style={{ color: '#868e96', fontSize: 12 }}>已有账号？</span>
                <button className="switch-btn" onClick={() => switchTo('login')} style={{ marginLeft: 8 }}>去登录</button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;

