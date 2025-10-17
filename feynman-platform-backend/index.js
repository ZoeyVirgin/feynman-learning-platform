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
        console.log('数据库连接成功');
        // 同步数据库表（开发环境）
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log('数据库表已同步');
    })
    .catch(err => {
        console.error('数据库连接错误:', err);
    });

//api路由
app.use('/api/users', require('./routes/users'));

//访问 http://localhost:4500/ 触发
app.get('/', (req, res) => {
    res.send("欢迎来到新世界！")
});

//监听服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});