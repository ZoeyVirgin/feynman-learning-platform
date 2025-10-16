const express = require('express');//引入express工具包
const cors = require('cors');//引入cors允许跨域请求
const bcrypt = require('bcryptjs');//加密密码
require('dotenv').config();//读取文件环境配置

//导入数据库配置和模型
const sequelize = require('./config/database');
const User = require('./models/User');

//创建express实例，定义服务器端口号，优先环境变量中的端口号否则4500
const app = express();
const port = process.env.PORT || 4500;

//中间件，允许跨域和解析json数据
app.use(cors());
app.use(express.json());

//数据库连接
sequelize.authenticate()
    .then(() => {
        console.log('MySQL connected successfully!');
        // 同步数据库表（开发环境）
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log('Database tables synchronized!');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

//api路由
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                msg: existingUser.email === email ? 'Email already exists' : 'Username already exists'
            });
        }

        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 创建新用户
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({ msg: 'User registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

//访问 http://localhost:4500/ 触发
app.get('/', (req, res) => {
    res.send("欢迎来到新世界！")
});

//监听服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});