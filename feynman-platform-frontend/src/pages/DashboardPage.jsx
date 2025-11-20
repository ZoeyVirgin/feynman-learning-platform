// src/pages/DashboardPage.jsx
import './DashboardPage.css';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';

function DashboardPage() {
    const [knowledgePoints, setKnowledgePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKnowledgePoints = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/knowledge-points');
                setKnowledgePoints(response.data);
            } catch (err) {
                console.error(err);
                setError('获取知识点失败');
            } finally {
                setLoading(false);
            }
        };

        fetchKnowledgePoints();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('你确定要删除这个知识点吗？')) return;

        try {
            await apiClient.delete(`/knowledge-points/${id}`);
            setKnowledgePoints(prev => prev.filter(kp => kp.id !== id));
        } catch (err) {
            console.error('删除失败', err);
        }
    };

    if (loading) return <p className="loading-text">加载中...</p>;
    if (error) return <p className="error-text">{error}</p>;

    return (
        <div className="dashboard-page">
            <h1>我的知识点</h1>
            <div className="new-kp-container">
                <Link to="/kp/new">
                    <button className="new-kp-btn">+ 新建知识点</button>
                </Link>
            </div>

            {knowledgePoints.length === 0 ? (
                <p className="empty-text">你还没有任何知识点，快去创建一个吧！</p>
            ) : (
                <div className="knowledge-points-grid">
                    {knowledgePoints.map((kp) => (
                        <div key={kp.id} className="knowledge-point-card">
                            <h2>{kp.title}</h2>
                            <div
                                className="knowledge-point-content"
                                dangerouslySetInnerHTML={{ __html: kp.content }}
                            />
                            <div className="knowledge-point-actions">
                                <Link to={`/kp/edit/${kp.id}`}>
                                    <button className="edit-btn">编辑</button>
                                </Link>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDelete(kp.id)}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
