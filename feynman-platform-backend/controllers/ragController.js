// controllers/ragController.js
// RAG 问答控制器：检索用千帆 Embedding（本地向量库），生成用 DeepSeek LLM
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getRetriever, VECTOR_STORE_PATH } = require('../services/vectorStoreService');

// DeepSeek 环境
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

function buildMcpPrompt(context, question) {
  return (
    `<role>你是一个基于私有知识库进行问答的智能助手。</role>\n` +
    `<instruction>严格依据<context>提供的资料回答<question>。如果资料不足，请明确回答“我不知道”，不要编造。回答要准确、简洁、结构清晰。</instruction>\n\n` +
    `<context>\n${context}\n</context>\n\n` +
    `<question>\n${question}\n</question>\n\n` +
    `<answer>请直接给出最终回答：</answer>`
  );
}

exports.answerWithRAG = async (req, res) => {
  const { question, returnSources } = req.body || {};
  if (!question || !String(question).trim()) {
    return res.status(400).json({ msg: 'question 为必填' });
  }

  try {
    // 1) 检索相关文档
    let docs = [];
    try {
      const retriever = await getRetriever(4);
      docs = await retriever.invoke(question);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[RAG] 检索器不可用或向量库未初始化：', e?.message || e);
      }
    }

    const formatted = (docs || []).map((d, i) => `--- 片段${i + 1} ---\n${d.pageContent}`).join('\n\n');

    // 2) 构造 MCP 风格提示词
    const prompt = buildMcpPrompt(formatted || '（无检索结果）', question);

    // 3) 调用 DeepSeek 生成
    const resp = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: '你是严谨的知识库问答助手。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    const answer = resp?.data?.choices?.[0]?.message?.content || '';
    const payload = { answer: answer.trim() };
    if (returnSources) {
      payload.sources = (docs || []).map((d, i) => ({ index: i + 1, content: d.pageContent, metadata: d.metadata || {} }));
    }
    return res.json(payload);
  } catch (err) {
    console.error('[RAG] 生成失败:', err?.response?.data || err.message);
    return res.status(500).json({ msg: 'RAG 生成失败', error: err?.response?.data || err.message });
  }
};

// ============ 运维：向量库状态查询 ============
exports.vectorStoreStatus = async (req, res) => {
  try {
    const dir = VECTOR_STORE_PATH;
    const exists = fs.existsSync(dir);
    let files = [];
    let retrieverReady = false;
    let error = null;
    if (exists) {
      try {
        files = fs.readdirSync(dir);
      } catch (e) {
        error = e.message;
      }
    }
    try {
      const retriever = await getRetriever(1);
      if (retriever) retrieverReady = true;
    } catch (e) {
      error = e.message || String(e);
    }
    return res.json({ dir, exists, files, retrieverReady, error });
  } catch (e) {
    return res.status(500).json({ msg: '查询失败', error: e?.message || String(e) });
  }
};

// ============ 运维：重建向量库（开发环境） ============
exports.rebuildVectorStore = async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || 'development');
    if (env !== 'development') {
      return res.status(403).json({ msg: '仅开发环境允许重建' });
    }

    const dir = VECTOR_STORE_PATH;
    if (fs.existsSync(dir)) {
      // 清空目录
      for (const f of fs.readdirSync(dir)) {
        try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
      }
    } else {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }

    const KnowledgePoint = require('../models/KnowledgePoint');
    const { addKnowledgePointToStore } = require('../services/vectorStoreService');
    const kps = await KnowledgePoint.findAll({ attributes: ['id', 'content'] });
    let count = 0;
    for (const kp of kps) {
      if (kp.content && String(kp.content).trim()) {
        await addKnowledgePointToStore(kp);
        count += 1;
      }
    }

    return res.json({ ok: true, rebuilt: count, dir });
  } catch (e) {
    return res.status(500).json({ msg: '重建失败', error: e?.message || String(e) });
  }
};
