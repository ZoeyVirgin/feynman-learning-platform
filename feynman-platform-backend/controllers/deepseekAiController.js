// controllers/deepseekAiController.js
// 使用 DeepSeek Chat Completions API 实现文本润色、智能评价、出题与评分
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

async function callDeepSeek(messages, temperature = 0.2) {
  const resp = await axios.post(
    `${DEEPSEEK_BASE_URL}/chat/completions`,
    { model: DEEPSEEK_MODEL, messages, temperature, response_format: { type: 'text' } },
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` }, timeout: 60000 }
  );
  const content = resp?.data?.choices?.[0]?.message?.content || '';
  return content;
}

// =============== 第8课：复述评价 ===============
exports.evaluateFeynmanAttempt = async (req, res) => {
  const { originalContent, transcribedText } = req.body || {};
  if (!originalContent || !transcribedText) {
    return res.status(400).json({ msg: 'originalContent 与 transcribedText 均为必填' });
  }

  try {
    const systemPrompt = '你是一个严格而友善的计算机科学学习教练。请仅返回严格 JSON。';
    const userPrompt = `【原始知识点】:\n\n${originalContent}\n\n【学生的口头复述文本】:\n\n${transcribedText}\n\n请完成如下任务并仅以 JSON 返回：\n{\n  "polishedText": "这里是润色后的文本",\n  "evaluation": "这里是你的综合评价",\n  "strengths": ["优点1", "优点2"],\n  "weaknesses": ["可以改进的地方1", "可以改进的地方2"],\n  "score": 85\n}`;

    const content = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const parsed = extractJson(content);
    if (!parsed) return res.status(502).json({ msg: 'LLM 返回不可解析的结果', raw: content });

    const result = {
      polishedText: parsed.polishedText || '',
      evaluation: parsed.evaluation || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      score: Number.isFinite(parsed.score) ? Math.round(parsed.score) : 0,
    };
    return res.json(result);
  } catch (error) {
    console.error('Error calling DeepSeek(evaluate):', error?.response?.data || error.message);
    return res.status(500).json({ msg: '调用 DeepSeek 失败', error: error?.response?.data || error.message });
  }
};

// =============== 第9课：AI 出题 ===============
exports.generateQuestion = async (req, res) => {
  const { knowledgePointContent, difficulty, type } = req.body || {};
  if (!knowledgePointContent || !difficulty) {
    return res.status(400).json({ msg: 'knowledgePointContent 与 difficulty 为必填' });
  }
  const contentText = String(knowledgePointContent || '').trim();
  if (contentText.length < 20) {
    return res.status(422).json({ msg: '知识点太混乱啦，内容过短，AI 暂时无法生成高质量题目，请先完善知识点内容后再试。' });
  }
  const qType = type || 'single-choice'; // 支持 single-choice / short-answer

  try {
    const systemPrompt = '你是专业的计算机科学出题专家。请仅返回严格 JSON。';
    let userPrompt = '';

    if (qType === 'short-answer') {
      userPrompt = `根据以下知识点内容与难度，生成一题简答题，并给出答案要点(数组)：\n\n【知识点内容】:\n"""\n${knowledgePointContent}\n"""\n\n【指定难度】:${difficulty}\n\n严格按此 JSON 返回，不要额外解释：\n{\n  "type": "short-answer",\n  "difficulty": "${difficulty}",\n  "question": "这里是题干",\n  "answer_key_points": ["要点1", "要点2"]\n}`;
    } else {
      userPrompt = `根据以下知识点内容与难度，生成一题单项选择题：\n\n【知识点内容】:\n"""\n${knowledgePointContent}\n"""\n\n【指定难度】:${difficulty}\n\n严格按此 JSON 返回，不要额外解释，确保字段完整：\n{\n  "type": "single-choice",\n  "difficulty": "${difficulty}",\n  "question": "这里是题干",\n  "options": {\n    "A": "选项A的内容",\n    "B": "选项B的内容",\n    "C": "选项C的内容",\n    "D": "选项D的内容"\n  },\n  "answer": "C",\n  "explanation": "这里是对正确答案的简短解释"\n}`;
    }

    const content = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const parsed = extractJson(content);
    if (!parsed) return res.status(422).json({ msg: '知识点太混乱啦，AI 暂时无法根据该内容生成题目，请先完善知识点内容后再试。', raw: content });

    // 兜底与校验
    if (qType === 'short-answer') {
      return res.json({
        type: 'short-answer',
        difficulty,
        question: parsed.question || '',
        answer_key_points: Array.isArray(parsed.answer_key_points) ? parsed.answer_key_points : [],
      });
    } else {
      const opts = parsed.options && typeof parsed.options === 'object' ? parsed.options : {};
      return res.json({
        type: 'single-choice',
        difficulty,
        question: parsed.question || '',
        options: {
          A: opts.A || '',
          B: opts.B || '',
          C: opts.C || '',
          D: opts.D || '',
        },
        answer: parsed.answer || 'A',
        explanation: parsed.explanation || '',
      });
    }
  } catch (error) {
    console.error('Error calling DeepSeek(generateQuestion):', error?.response?.data || error.message);
    return res.status(500).json({ msg: '调用 DeepSeek 生成题目失败', error: error?.response?.data || error.message });
  }
};

// =============== 第9课：AI 阅卷评分（简答） ===============
exports.gradeAnswer = async (req, res) => {
  const { question, answerKeyPoints, studentAnswer } = req.body || {};
  if (!question || !studentAnswer || !answerKeyPoints) {
    return res.status(400).json({ msg: 'question, answerKeyPoints, studentAnswer 均为必填' });
  }
  const keyPoints = Array.isArray(answerKeyPoints) ? answerKeyPoints : [String(answerKeyPoints)];

  try {
    const systemPrompt = '你是一个客观的计算机科学阅卷老师。请仅返回严格 JSON。';
    const userPrompt = `【题目】: ${question}\n\n【答案要点】: ${JSON.stringify(keyPoints)}\n\n【学生的回答】: ${studentAnswer}\n\n严格按此 JSON 返回：\n{\n  "isCorrect": true,\n  "explanation": "这里是你的评判理由"\n}`;

    const content = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const parsed = extractJson(content);
    if (!parsed) return res.status(502).json({ msg: 'LLM 返回不可解析的结果', raw: content });

    return res.json({
      isCorrect: Boolean(parsed.isCorrect),
      explanation: parsed.explanation || '',
    });
  } catch (error) {
    console.error('Error calling DeepSeek(gradeAnswer):', error?.response?.data || error.message);
    return res.status(500).json({ msg: '调用 DeepSeek 阅卷失败', error: error?.response?.data || error.message });
  }
};
