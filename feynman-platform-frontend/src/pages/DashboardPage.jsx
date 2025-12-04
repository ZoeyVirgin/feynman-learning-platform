// src/pages/DashboardPage.jsx
import './DashboardPage.css';
import 'katex/dist/katex.min.css';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import apiClient from '../api/axios';
import MermaidRenderer from '../components/MermaidRenderer';

const decodeHtmlEntities = (str) => str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, '\'')
    .replace(/&#39;/g, '\'');

const MARKDOWN_HINTS = /(^|\n)\s{0,4}(#{1,6}\s|[-*+]\s|\d+\.\s|```|~~~|\|.*\||\$\$|graph\s+(?:td|tb|lr|rl)|flowchart|sequenceDiagram|stateDiagram|classDiagram|mindmap|mermaid)/i;
const MERMAID_KEYWORDS = /(graph\s+(?:tb|td|lr|rl)|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|mindmap|quadrantChart|pie)\b/i;

const normalizeFullWidthChars = (text) => {
    if (typeof text !== 'string') return '';
    const map = {
        '（': '(',
        '）': ')',
        '，': ',',
        '。': '.',
        '；': ';',
        '：': ':',
        '？': '?',
        '！': '!',
        '【': '[',
        '】': ']',
        '｛': '{',
        '｝': '}',
        '“': '"',
        '”': '"',
        '‘': '\'',
        '’': '\'',
        '、': '/',
    };
    return text.replace(/[（），。；：？！【】｛｝“”‘’、]/g, (char) => map[char] || char);
};

const normalizeMermaidSyntax = (content) => {
    if (typeof content !== 'string') return '';
    return content.replace(/^\s*图\s*([Tt][Dd]|[Tt][Bb]|[Ll][Rr]|[Rr][Ll])\s*;?/gm, (_, dir) => `graph ${dir.toUpperCase()};`);
};

const containsEscapedMarkdown = (html) => {
    if (typeof html !== 'string') return false;
    const decoded = decodeHtmlEntities(html);
    const plain = decoded.replace(/<[^>]+>/g, '\n');
    return MARKDOWN_HINTS.test(plain);
};

const ensureMermaidFence = (content) => {
    if (typeof content !== 'string') return '';
    const normalized = normalizeMermaidSyntax(content);
    if (/```mermaid/.test(normalized)) return normalized;
    const match = normalized.match(MERMAID_KEYWORDS);
    if (!match) return normalized;

    const start = match.index ?? 0;
    const before = normalized.slice(0, start).trimEnd();
    const after = normalized.slice(start).trim();

    const mermaidBlock = after;

    let result = before;
    if (before) result += '\n\n';
    result += '```mermaid\n' + mermaidBlock + '\n```';
    return result;
};

const cleanHtmlToMarkdown = (html) => {
    if (typeof html !== 'string') return '';
    if (!containsEscapedMarkdown(html)) return html;

    let decoded = normalizeFullWidthChars(decodeHtmlEntities(html));
    decoded = decoded
        .replace(/<p[^>]*>/g, '\n')
        .replace(/<\/p>/g, '\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<\/?(span|div)[^>]*>/g, '')
        .replace(/<\/?strong>/g, '**')
        .replace(/<\/?em>/g, '_')
        .replace(/<\/?u>/g, '')
        .replace(/<\/?code>/g, '`')
        .replace(/&nbsp;/g, ' ')
        .replace(/--&gt;/g, '-->')
        .replace(/\n{3,}/g, '\n\n');

    const result = decoded.trim();
    return ensureMermaidFence(result);
};

const isProbablyPureHtml = (str) => {
    if (typeof str !== 'string') return false;
    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(str);
    if (!hasHtmlTags) return false;

    const hasMarkdownSyntax = /^#{1,6}\s|^\s*[-*+]\s|^\d+\.\s|```|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\|.*\||\$\$[\s\S]*?\$\$|\$[^$]+\$/m.test(str);
    const hasMermaidBlock = /```mermaid[\s\S]*?```/i.test(str);

    return !hasMarkdownSyntax && !hasMermaidBlock;
};

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
            setKnowledgePoints(prev => prev.filter(kp => (kp.id ?? kp._id) !== id));
        } catch (err) {
            console.error('删除失败', err);
        }
    };

    const markdownComponents = useMemo(() => ({
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            if (!inline && match?.[1] === 'mermaid') {
                return <MermaidRenderer code={codeContent} />;
            }

            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
    }), []);

    const renderContent = (kp) => {
        const raw = kp.content ?? '';
        const cleaned = cleanHtmlToMarkdown(raw);
        const shouldRenderAsHtml = isProbablyPureHtml(cleaned);

        if (import.meta.env.DEV) {
            console.debug('渲染知识点：', {
                id: kp?.id ?? kp?._id ?? '无ID',
                title: kp?.title,
                preview: cleaned.slice(0, 80),
                detectedHtml: shouldRenderAsHtml,
            });
        }

        if (shouldRenderAsHtml) {
            return (
                <div
                    className="rich-text-html"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleaned) }}
                />
            );
        }

        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={markdownComponents}
            >
                {cleaned}
            </ReactMarkdown>
        );
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
                        <div key={kp.id ?? kp._id} className="knowledge-point-card">
                            <h2>{kp.title}</h2>
                            <div className="knowledge-point-content markdown-content">
                                {renderContent(kp)}
                            </div>
                            <div className="knowledge-point-actions">
                                <Link to={`/kp/edit/${kp.id ?? kp._id}`}>
                                    <button className="action-btn edit-btn">编辑</button>
                                </Link>
                                <Link to={`/feynman/${kp.id ?? kp._id}`}>
                                    <button className="action-btn feynman-btn">开始复述</button>
                                </Link>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(kp.id ?? kp._id)}
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
