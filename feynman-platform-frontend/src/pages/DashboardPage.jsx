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

    if (loading) return <p>加载中...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    const handleDelete = async (id) => {
        if (!window.confirm('你确定要删除这个知识点吗？')) return;

        try {
            await apiClient.delete(`/knowledge-points/${id}`);
            setKnowledgePoints(knowledgePoints.filter(kp => kp.id !== id));
        } catch (err) {
            console.error('删除失败', err);
        }
    };


    return (
        <div>
            <h1>我的知识点</h1>
            <Link to="/kp/new">
                <button>+ 新建知识点</button>
            </Link>

            <div style={{ marginTop: '20px' }}>
                {knowledgePoints.length === 0 ? (
                    <p>你还没有任何知识点，快去创建一个吧！</p>
                ) : (
                    <ul>
                        <ul>
                            {knowledgePoints.map((kp) => (
                                <li key={kp.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                                    <h2>{kp.title}</h2>
                                    <div dangerouslySetInnerHTML={{ __html: kp.content }} />
                                    <div style={{ marginTop: '10px' }}>
                                        <Link to={`/kp/edit/${kp.id}`}>
                                            <button>编辑</button>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(kp.id)}
                                            style={{ marginLeft: '10px', background: 'red' }}
                                        >
                                            删除
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                    </ul>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;
