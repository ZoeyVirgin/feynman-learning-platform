// src/pages/LoginPage.jsx
import { useState } from 'react';
import apiClient from '../api/axios'; // 引入apiClient
import { useNavigate } from 'react-router-dom'; // 用于跳转
import { useAuth } from '../context/AuthContext'; // 引入useAuth

function LoginPage() {

  const { login } = useAuth(); // 拿到全局登录函数

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/users/login', formData);

      // ✅ 将 token 和用户信息存到全局状态
      login(response.data.token, response.data.user);

      console.log('Token 已保存到全局状态:', response.data.token);

      // 登录成功后跳转到主页
      navigate('/');
    } catch (err) {
      console.error('登录失败:', err.response?.data);
      setError(err.response?.data?.msg || '登录失败，请稍后再试');
    }
  };


  return (
    <div>
      <h1>登录</h1>
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
    </div>
  );
}

export default LoginPage;
