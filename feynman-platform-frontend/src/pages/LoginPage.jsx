// src/pages/LoginPage.jsx
import { useState } from 'react';
import apiClient from '../api/axios'; // 引入apiClient
import { useNavigate } from 'react-router-dom'; // 用于跳转

function LoginPage() {
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
      // 发送登录请求
      const response = await apiClient.post('/users/login', formData);
      console.log('登录成功，返回数据:', response.data);

      // 登录成功后跳转到主页
      navigate('/');

      // 这里我们后续会用 Context 保存 token
      // 暂时先打印看看
      console.log('Token:', response.data.token);
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
