// routes/ai.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  generateQuestion,
  gradeAnswer,
} = require('../controllers/deepseekAiController');

console.log('[routes/ai] AI 路由已加载');

// 生成题目（支持单选或简答，默认单选）
router.post('/generate-question', auth, generateQuestion);

// 评测答案（用于简答题，或可统一由后端判分）
router.post('/grade-answer', auth, gradeAnswer);

// 健康检查（用于快速确认路由是否挂载成功）
router.get('/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

module.exports = router;

