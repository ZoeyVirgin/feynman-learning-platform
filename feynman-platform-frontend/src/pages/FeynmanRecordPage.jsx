// src/pages/FeynmanRecordPage.jsx
import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import './FeynmanRecordPage.css'; // 引入新的样式文件

function FeynmanRecordPage() {
    const { id } = useParams(); // 知识点ID
    const [kpTitle, setKpTitle] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // 使用 hook
    const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true });

    // 获取返回的功能
    const navigate = useNavigate(); // 用于导航

    useEffect(() => {
        // 获取知识点标题用于显示
        const fetchKpTitle = async () => {
            const response = await apiClient.get(`/knowledge-points/${id}`);
            setKpTitle(response.data.title);
        };
        fetchKpTitle();
    }, [id]);

    const handleStopRecording = async () => {
        stopRecording(); // 这个库的stopRecording是异步的，但我们可以在onStop回调中处理
    };

    const uploadAudio = async (blobUrl) => {
        setIsUploading(true);
        setTranscribedText('');
        try {
            const audioBlob = await fetch(blobUrl).then(r => r.blob());
            const audioFile = new File([audioBlob], `feynman-record-${id}.wav`, { type: 'audio/wav' });

            const formData = new FormData();
            formData.append('audio', audioFile); // 'audio'要和后端multer的字段名一致
            formData.append('knowledgePointId', id); // 顺便把知识点ID也传过去

            const response = await apiClient.post('/audio/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setTranscribedText(response.data.result);
        } catch (error) {
            console.error('上传或转录失败', error);
            setTranscribedText('转录失败，请重试。');
        } finally {
            setIsUploading(false);
        }
    };

    // 改造 useReactMediaRecorder，使其在停止时自动上传
    const { status: recStatus, startRecording: recStart, stopRecording: recStop, mediaBlobUrl: recUrl } = useReactMediaRecorder({
        audio: true,
        onStop: (blobUrl, blob) => {
            uploadAudio(blobUrl);
        }
    });

    return (
        <div className="feynman-record-page">
            <h1>复述知识点: {kpTitle}</h1>

            {/* 返回按钮 */}
            <button onClick={() => navigate(-1)} className="back-btn">
                返回
            </button>

            <hr />

            {/* 按钮区域 */}
            <div className="action-buttons">
                <button onClick={recStart} disabled={recStatus === 'recording'} className="record-btn">
                    开始录音
                </button>
                <button onClick={recStop} disabled={recStatus !== 'recording'} className="record-btn">
                    停止录音
                </button>
            </div>

            {/* 录音状态 */}
            <p className="rec-status">录音状态: {recStatus}</p>

            {recUrl && <audio src={recUrl} controls />}

            <hr />

            <h2>AI 转录结果:</h2>
            {isUploading && <p className="uploading-text">正在上传并转录，请稍候...</p>}
            <div className="transcription-container">
                {transcribedText}
            </div>
        </div>
    );
}

export default FeynmanRecordPage;
