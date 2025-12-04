// controllers/baiduAiController.js
const AipSpeechClient = require("baidu-aip-sdk").speech;

// 从环境变量中获取凭证
const APP_ID = process.env.BAIDU_APP_ID;
const API_KEY = process.env.BAIDU_API_KEY;
const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 新建一个AipSpeechClient对象
const client = new AipSpeechClient(APP_ID, API_KEY, SECRET_KEY);

exports.transcribeAudio = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No audio file uploaded.' });
    }

    // req.file.buffer 包含了音频文件的二进制数据
    const audioBuffer = req.file.buffer;

    try {
        // 调用语音识别短语音版
        // 'wav' 是文件格式, 16000 是采样率, dev_pid: 1537 是普通话模型
        const result = await client.recognize(audioBuffer, 'wav', 16000, {
            dev_pid: 1537,
        });

        console.log('Baidu ASR Result:', result);

        // 检查返回结果
        if (result.err_no === 0) {
            // 成功
            res.json({ result: result.result[0] });
        } else {
            // 失败
            res.status(500).json({ msg: 'Baidu ASR service error', error: result });
        }

    } catch (error) {
        console.error('Error calling Baidu ASR API:', error);
        res.status(500).send('Server error during transcription.');
    }
};