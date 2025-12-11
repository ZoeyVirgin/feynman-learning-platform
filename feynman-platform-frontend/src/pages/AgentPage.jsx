import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/axios';
import './AgentPage.css';

function AgentPage() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '你好！我是你的专属知识库AI助手。有什么可以帮你的吗？' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const question = inputValue;
    const userMessage = { sender: 'user', text: question };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/rag-qa', { question, returnSources: true });
      const text = response?.data?.answer || '（无返回内容）';
      const sources = Array.isArray(response?.data?.sources) ? response.data.sources : [];
      const botMessage = { sender: 'bot', text, sources };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      const errorMessage = { sender: 'bot', text: '抱歉，我遇到了一些问题，请稍后再试。' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-page">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="message-bubble">
              {msg.text}
              {msg.sender === 'bot' && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                <div className="sources">
                  <div className="sources-title">参考片段：</div>
                  {msg.sources.map((s, i) => (
                    <div key={i} className="source-item">
                      <div className="source-index">片段 {s.index || i + 1}</div>
                      <div className="source-content">{(s.content || '').slice(0, 240)}{(s.content || '').length > 240 ? '…' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-bubble typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="在这里输入你的问题..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '思考中...' : '发送'}
        </button>
      </form>
    </div>
  );
}

export default AgentPage;

