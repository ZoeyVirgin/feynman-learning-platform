// src/pages/DashboardPage.jsx
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

    if (loading) return <p style={{ textAlign: 'center' }}>加载中...</p>;
    if (error) return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>我的知识点</h1>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <Link to="/kp/new">
                    <button
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            fontSize: '16px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#45a049')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4CAF50')}
                    >
                        + 新建知识点
                    </button>
                </Link>
            </div>

            {knowledgePoints.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '16px' }}>你还没有任何知识点，快去创建一个吧！</p>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px',
                    }}
                >
                    {knowledgePoints.map((kp) => (
                        <div
                            key={kp.id}
                            style={{
                                border: '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                            }}
                        >
                            <h2 style={{ marginBottom: '10px' }}>{kp.title}</h2>
                            <div
                                style={{
                                    maxHeight: '250px',
                                    overflow: 'auto',
                                    marginBottom: '10px',
                                }}
                                dangerouslySetInnerHTML={{ __html: kp.content }}
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Link to={`/kp/edit/${kp.id}`}>
                                    <button
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: '#2196F3',
                                            color: 'white',
                                            marginRight: '8px',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1976D2')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
                                    >
                                        编辑
                                    </button>
                                </Link>
                                <button
                                    onClick={() => handleDelete(kp.id)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: 'red',
                                        color: 'white',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc0000')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'red')}
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
