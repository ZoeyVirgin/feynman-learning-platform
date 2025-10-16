//引入express工具包
const express = require('express');

//创建express实例
const app = express();

//定义服务器端口号
const port = 4500;

//访问 http://localhost:4500/ 触发
app.get('/', (req, res) => {
    res.send("欢迎来到新世界！")
});

//监听服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});