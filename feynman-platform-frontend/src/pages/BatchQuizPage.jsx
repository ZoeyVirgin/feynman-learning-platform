// src/pages/BatchQuizPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/axios';

// 复用 QuizPage 的核心交互：出题 + 阅卷
function BatchQuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ids = useMemo(() => {
    const raw = searchParams.get('ids') || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);

  const [kps, setKps] = useState([]); // 选中的知识点详情数组
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [shortAnswer, setShortAnswer] = useState('');
  const [result, setResult] = useState(null); // { isCorrect, explanation }

  useEffect(() => {
    const fetchAll = async () => {
      if (!ids.length) return;
      setIsLoading(true);
      setError('');
      try {
        const results = await Promise.all(
          ids.map((id) => apiClient.get(`/knowledge-points/${id}`))
        );
        setKps(results.map((r) => r.data));
      } catch (err) {
        console.error(err);
        setError('加载所选知识点失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [ids]);

  const combinedContent = useMemo(() => {
    if (!kps.length) return '';
    // 用标题分隔，便于 AI 识别
    return kps
      .map((kp, idx) => `【${idx + 1}】${kp.title}\n\n${kp.content || ''}`)
      .join('\n\n---\n\n');
  }, [kps]);

  const fetchQuestion = async (difficulty = '基础', type = 'single-choice') => {
    if (!combinedContent) return;
    setIsLoading(true);
    setError('');
    setQuestion(null);
    setResult(null);
    setSelectedOption('');
    setShortAnswer('');
    try {
      const resp = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: combinedContent,
        difficulty,
        type,
      });
      setQuestion(resp.data);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.msg || (err?.response?.status === 404 ? '服务端未找到出题接口，请重启后端或检查 /api/ai 路由是否挂载。' : 'AI 出题失败，请稍后重试');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateReviewStatusForAll = async (needsReview) => {
    try {
      await Promise.allSettled(ids.map((id) => apiClient.put(`/knowledge-points/${id}`, { reviewList: needsReview })));
    } catch (err) {
      console.error('批量更新复习状态失败', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question) return;

    if (question.type === 'single-choice') {
      if (!selectedOption) {
        alert('请选择一个答案！');
        return;
      }
      const isCorrect = selectedOption === question.answer;
      setResult({ isCorrect, explanation: question.explanation || '' });
      if (!isCorrect) updateReviewStatusForAll(true);
      return;
    }

    if (question.type === 'short-answer') {
      if (!shortAnswer.trim()) {
        alert('请填写你的答案');
        return;
      }
      try {
        setIsLoading(true);
        const resp = await apiClient.post('/ai/grade-answer', {
          question: question.question,
          answerKeyPoints: question.answer_key_points,
          studentAnswer: shortAnswer,
        });
        setResult({
          isCorrect: !!resp.data?.isCorrect,
          explanation: resp.data?.explanation || '',
        });
        if (!resp.data?.isCorrect) updateReviewStatusForAll(true);
      } catch (err) {
        console.error(err);
        setError('AI 阅卷失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h1>批量出题</h1>
      <button onClick={() => navigate(-1)} className="back-btn" style={{ marginBottom: 12 }}>返回</button>

      <div style={{ marginBottom: 12 }}>
        <strong>已选知识点（{kps.length}）:</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {kps.map((kp) => (
            <span key={kp.id ?? kp._id} style={{
              padding: '4px 8px',
              background: 'var(--color-surface-soft)',
              borderRadius: 12,
              fontSize: 12,
              border: '1px solid #dee2e6'
            }}>
              {kp.title}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => fetchQuestion('基础', 'single-choice')} className="btn-basic" disabled={isLoading} style={{ marginRight: 8 }}>单选·基础</button>
        <button onClick={() => fetchQuestion('中等', 'single-choice')} className="btn-medium" disabled={isLoading} style={{ marginRight: 8 }}>单选·中等</button>
        <button onClick={() => fetchQuestion('困难', 'single-choice')} className="btn-hard" disabled={isLoading} style={{ marginRight: 8 }}>单选·困难</button>
        <span style={{ margin: '0 12px' }}>|</span>
        <button onClick={() => fetchQuestion('中等', 'short-answer')} className="btn-short" disabled={isLoading} style={{ marginRight: 8 }}>简答·中等</button>
      </div>

      {isLoading && <p>AI 正在出题/阅卷中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {question && !result && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>
            [{question.type === 'single-choice' ? '单选' : '简答'} · {question.difficulty}] {question.question}
          </h3>

          {question.type === 'single-choice' && (
            <div style={{ marginBottom: 16 }}>
              {Object.entries(question.options || {}).map(([key, value]) => (
                <div key={key} style={{ marginBottom: 6 }}>
                  <label>
                    <input
                      type="radio"
                      name="option"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      style={{ marginRight: 8 }}
                    />
                    {key}. {value}
                  </label>
                </div>
              ))}
            </div>
          )}

          {question.type === 'short-answer' && (
            <div style={{ marginBottom: 16 }}>
              <textarea
                placeholder="请在此作答..."
                rows={6}
                style={{ width: '100%', padding: 8 }}
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
              />
            </div>
          )}

          <button type="submit">提交答案</button>
        </form>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>测评结果</h2>
          <p style={{ color: result.isCorrect ? 'green' : 'red', fontWeight: 'bold' }}>
            {result.isCorrect ? '回答正确！' : '回答错误！'}
          </p>
          {question.type === 'single-choice' && (
            <p><strong>正确答案是: {question.answer}</strong></p>
          )}
          <p><strong>解释:</strong> {result.explanation}</p>
          {!result.isCorrect && <p style={{ color: 'orange' }}>已将这些知识点加入你的复习列表。</p>}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => fetchQuestion(question.difficulty, question.type)} style={{ marginRight: 8 }}>再来一题</button>
            <button onClick={() => navigate(-1)}>返回</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchQuizPage;

