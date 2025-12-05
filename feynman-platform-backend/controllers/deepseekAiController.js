// controllers/deepseekAiController.js
// 使用 DeepSeek Chat Completions API 实现文本润色与智能评价
const axios = require('axios');

// 允许通过环境变量配置；若未配置，使用用户提供的临时密钥（仅供本地演示）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-63aa32666e874ed3b55036dea3ea0158';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

function extractJson(text) {
  if (!text) return null;
  // 去掉可能的代码块包裹
  const fenced = text.match(/```(?:json)?[\s\S]*?```/i);
  if (fenced) {
    text = fenced[0].replace(/```(?:json)?/i, '').replace(/```/g, '').trim();
  }
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch (_) {}
  // 宽松匹配第一个花括号 JSON 片段
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (_) {}
  }
  return null;
}

exports.evaluateFeynmanAttempt = async (req, res) => {
  const { originalContent, transcribedText } = req.body || {};
  if (!originalContent || !transcribedText) {
    return res.status(400).json({ msg: 'originalContent 与 transcribedText 均为必填' });
  }

  try {
    const systemPrompt = `你是一个严格而友善的计算机科学学习教练。你的任务是评估学生对一个知识点的复述，并给出反馈。请仅返回严格 JSON，字段必须包含：polishedText, evaluation, strengths, weaknesses, score。score 为 0-100 的整数。`;

    const userPrompt = `【原始知识点】:\n\n${originalContent}\n\n【学生的口头复述文本】:\n\n${transcribedText}\n\n请完成如下任务并仅以 JSON 返回：\n{\n  "polishedText": "这里是润色后的文本",\n  "evaluation": "这里是你的综合评价",\n  "strengths": ["优点1", "优点2"],\n  "weaknesses": ["可以改进的地方1", "可以改进的地方2"],\n  "score": 85\n}`;

    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'text' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    if (!parsed) {
      return res.status(502).json({ msg: 'LLM 返回不可解析的结果', raw: content });
    }

    // 兜底字段
    const result = {
      polishedText: parsed.polishedText || '',
      evaluation: parsed.evaluation || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      score: Number.isFinite(parsed.score) ? Math.round(parsed.score) : 0,
    };

    return res.json(result);
  } catch (error) {
    console.error('Error calling DeepSeek:', error?.response?.data || error.message);
    return res.status(500).json({ msg: '调用 DeepSeek 失败', error: error?.response?.data || error.message });
  }
};

