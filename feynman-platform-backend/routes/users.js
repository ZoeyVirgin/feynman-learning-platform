const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // 引入加密库
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- 用户注册 API (已集成密码加密) ---
// @route   POST /api/users/register
// @desc    注册一个新用户
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const {
            username,
            email,
            password
        } = req.body;
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ msg: '用户已存在' });
        }
        // 加密密码
        // 讲解：我们使用 bcrypt 库。它会先生成一个“盐”（salt），这是一个随机字符串，
        // 然后将盐和原始密码混合在一起进行哈希计算。
        // 这样做可以确保即使两个用户设置了相同的密码，它们在数据库中的哈希值也完全不同。
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            username,
            email,
            password: hashedPassword // 存储加密后的密码
        });
        // 生成 JWT 令牌（自定义令牌）
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            });
    } catch (err) {
        console.error(err);
        res.status(500).send('服务器错误');
    }
})

// --- 用户登录 API ---
// @route   POST /api/users/login
// @desc    用户登录并获取token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // 用户是否存在
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ msg: '无效的凭证' });
        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: '无效的凭证' });
        // 生成 JWT 令牌
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            });
    } catch (err) {
        console.error(err);
        res.status(500).send('服务器错误');
    }
});

module.exports = router;