import { useState } from 'react';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 引入useAuth

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // 这里可以拿到 login 函数，以备后续直接注册就登录

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/users/register', formData);

      console.log('注册成功:', response.data);

      // 可选：直接把 token 存到全局状态，如果后端注册就返回 token
      // login(response.data.token);

      // 注册完成后跳转到登录页
      // 注册成功后直接登录
      login(response.data.token, response.data.user);
      console.log('Token 和用户信息已保存到全局状态:', response.data.token, response.data.user);

      // 跳转到主页
      navigate('/');
    } catch (err) {
      console.error('注册失败:', err.response?.data);
      setError(err.response?.data?.msg || '注册失败，请稍后再试');
    }
  };

  return (
    <div>
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          placeholder="用户名"
          required
        />
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
        <button type="submit">注册</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default RegisterPage;
