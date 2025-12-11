好的，这是为您的《大前端与AI实战》实训课程设计并完善后的第十次课程内容。本次课聚焦 RAG 的“索引阶段”，完成文档处理、向量化与向量库落盘，统一了命名规范与 .env 配置，示例代码与当前项目风格保持一致。

---

### 《大前端与AI实战》第十次课程：RAG与私有知识库 (Part 1 - 后端基础)

课程主题：让 AI 学习你的专属知识：RAG 后端实现之文档处理与向量化  
总时长：4 学时（约 3-3.5 小时教学，0.5 小时答疑与休息）

#### 一、本次课程目标 (Objectives)
在本次课程结束后，同学们将能够：
1. 清晰阐述 RAG（Retrieval-Augmented Generation，检索增强生成）的思想与流程。
2. 理解文本嵌入（Embedding）与向量数据库的核心概念。
3. 使用 LangChain.js 实现文本加载（Load）与分割（Split）。
4. 在 Node.js 后端调用百度千帆 Embedding API 将文本块向量化。
5. 使用本地向量库（HNSWLib）存储文本块及向量，落盘到 vector_store 目录。
6. 将“创建/更新知识点”与“索引到向量库”的流程打通。

#### 二、命名规范与文件命名
- 课程文档命名：
  - 10《大前端与AI实战》第十次课程：RAG与私有知识库 (Part 1 - 后端基础).md
  - 11《大前端与AI实战》第十一次课程：RAG与私有知识库 (Part 2 - 检索与生成).md
- 代码命名：
  - 后端服务模块：services/vectorStoreService.js
  - 控制器：controllers/*.js  路由：routes/*.js
  - 采用小驼峰命名（camelCase），常量使用全大写 + 下划线。

#### 三、核心关键词 (Keywords)
- RAG（检索增强生成）
- 文本嵌入（Text Embedding）/ 向量化
- 向量数据库（Vector Store）
- LangChain.js / Text Splitter
- HNSWLib（本地向量库）
- 百度千帆 Embedding API

---

### 四、准备工作

#### 4.1 环境与版本建议
- Node.js ≥ 18
- 包管理器 npm 或 pnpm
- 已有本项目后端代码（CommonJS 规范，require 风格）

#### 4.2 .env 示例（本课程统一约定）
请在后端根目录创建 .env（不要提交到版本库），以下为课程环境模板（已按你提供的信息填充）：

```
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=feynman_platform
DB_USER=root
DB_PASSWORD=112657

# 服务器
PORT=4500
NODE_ENV=development

# JWT 配置
JWT_SECRET=ZoeyVirgin
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# 百度语音转写（如项目已用到）
BAIDU_APP_ID=120807437
BAIDU_API_KEY=LEgmBhFDYfaTaQ63U6vVFjgX
BAIDU_SECRET_KEY=U1Z4UXRF7d4RQRfHjmaehEU5BMZAKMgW

# DeepSeek 调用（用于大模型对话，下一课将用到）
DEEPSEEK_API_KEY=sk-63aa32666e874ed3b55036dea3ea0158
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 百度千帆 Embedding 与 LLM 配置（本课使用 Embedding）
# 如你只有 v3 复合 Key，可仅提供 QIANFAN_API_KEY；若有 AK/SK，请同时提供 SECRET 以获得更高兼容性
QIANFAN_API_KEY=bce-v3/ALTAK-uory7dbDf1lsyIvKcVJWL/883b1b4d88b0ace80c7fbff20a46e9f160107650
# 可选（若有）：
# QIANFAN_SECRET_KEY=你的千帆SECRET
```

安全提示：.env 不要提交到仓库；生产环境改用安全的配置下发方式。

#### 4.3 安装依赖
在后端项目根目录执行：

```bash
npm install langchain @langchain/community @langchain/baidu-qianfan hnswlib-node
```

说明：
- langchain：LangChain.js 核心
- @langchain/community：文档加载、向量库等集成
- @langchain/baidu-qianfan：千帆 Embedding 集成
- hnswlib-node：本地高性能近邻搜索库

---

### 五、后端 RAG 基础设施搭建（索引阶段）

#### 5.1 新建服务模块 services/vectorStoreService.js
```javascript
// services/vectorStoreService.js
const path = require('path');
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { BaiduQianfanEmbeddings } = require('@langchain/baidu-qianfan');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const VECTOR_STORE_PATH = path.join(__dirname, '../vector_store');

// 兼容仅提供 QIANFAN_API_KEY 或同时提供 SECRET 的两种写法
const qianfanConfig = process.env.QIANFAN_SECRET_KEY
  ? { baiduApiKey: process.env.QIANFAN_API_KEY, baiduApiSecret: process.env.QIANFAN_SECRET_KEY }
  : { baiduApiKey: process.env.QIANFAN_API_KEY };

// 初始化 Embedding 模型（百度千帆）
const embeddings = new BaiduQianfanEmbeddings(qianfanConfig);

// 文本分割器（可按需调整）
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

/**
 * 将单个知识点内容切分、向量化并写入本地向量库
 * @param {{ _id: string, content: string }} knowledgePoint
 */
async function addKnowledgePointToStore(knowledgePoint) {
  try {
    console.log(`[RAG] 为知识点 ${knowledgePoint._id} 进行索引...`);

    // 1) 分割文本
    const docs = await textSplitter.createDocuments(
      [knowledgePoint.content],
      [{ knowledgePointId: knowledgePoint._id.toString() }]
    );
    console.log(`[RAG] 文本被切分为 ${docs.length} 个块`);

    // 2) 载入/创建向量库并追加文档
    let vectorStore;
    try {
      vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
      await vectorStore.addDocuments(docs);
      console.log('[RAG] 已向现有向量库追加文档');
    } catch (e) {
      console.log('[RAG] 未发现向量库，创建新的库...');
      vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    }

    // 3) 落盘
    await vectorStore.save(VECTOR_STORE_PATH);
    console.log(`[RAG] 向量库已保存 -> ${VECTOR_STORE_PATH}`);
  } catch (err) {
    console.error('[RAG] 添加到向量库失败:', err);
  }
}

/**
 * 获取检索器（默认返回最相关的 k=4 条）
 */
async function getRetriever(k = 4) {
  const store = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
  return store.asRetriever(k);
}

/**
 * 直接进行向量检索（便于测试/调试）
 */
async function queryVectorStore(query, k = 4) {
  try {
    const retriever = await getRetriever(k);
    const docs = await retriever.invoke(query);
    return docs;
  } catch (error) {
    if (error?.message?.includes('No such file or directory')) return [];
    throw error;
  }
}

module.exports = {
  VECTOR_STORE_PATH,
  embeddings,
  addKnowledgePointToStore,
  getRetriever,
  queryVectorStore,
};
```

#### 5.2 集成到“知识点”业务流程
在 routes/knowledgePoints.js 中：

```javascript
// routes/knowledgePoints.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

// 创建知识点
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, status, reviewList } = req.body;
    const newKp = new KnowledgePoint({ title, content, status, reviewList });
    const kp = await newKp.save();

    // 异步索引（不阻塞响应）
    addKnowledgePointToStore(kp);

    res.json(kp);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 更新知识点（简单策略：直接追加新内容到向量库，允许冗余）
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, status, reviewList } = req.body;

    const prev = await KnowledgePoint.findById(req.params.id);
    const updated = await KnowledgePoint.findByIdAndUpdate(
      req.params.id,
      { $set: { title, content, status, reviewList } },
      { new: true }
    );

    if (prev && updated && prev.content !== updated.content) {
      addKnowledgePointToStore(updated);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
```

说明：HNSWLib 本地存储不擅长删除；教学场景采用“更新即追加”的简化策略。在生产环境可选用支持删除/更新的云向量库（如 Milvus、Weaviate、Pinecone 等）。

#### 5.3 测试与验证
1) 清理历史数据：若已有 vector_store 目录，可先删除。  
2) 启动后端服务。  
3) Postman 测试：
- POST /api/knowledge-points 创建若干知识点（内容尽量长一些）
- 查看控制台日志，确认“切分 N 个块”“已保存向量库”等输出
- 磁盘应生成 vector_store/args.json、docstore.json、hnswlib.index 等文件

可选：在任意临时代码处调用 queryVectorStore('你的查询')，验证检索返回。

---

### 六、课堂总结与作业

- 总结：
  - 已完成 RAG 的“索引阶段”：文本切分 -> 向量化 -> 本地向量库存储与落盘。
  - 知识点数据与向量库打通，为下一课“检索与生成”奠定基础。

- 课后作业：
  1) 至少创建 3 个不同主题的知识点，观察向量库变化与索引日志。  
  2) 思考不同 TextSplitter（Character/Markdown/Recursive）对检索效果的影响，并尝试更换参数（chunkSize/overlap）。  
  3) 扩展：实现一个“上传 .txt/.md 文件并入库”的接口，参考 @langchain/community 的各类 Loader。

- 常见问题（FAQ）：
  - Q：我只有 QIANFAN_API_KEY，没有 SECRET 能用吗？  
    A：课程代码已兼容仅 Key 的情形；若后续出现鉴权问题，请申请/配置 SECRET（AK/SK）。
  - Q：Windows 编译 hnswlib-node 失败？  
    A：请确保已安装 Python 与 C++ 构建工具；或切换到预构建环境（如 WSL/容器）。
  - Q：索引后如何“删除”旧数据？  
    A：本课采用教学用本地库，删除并重建 vector_store 即可；生产建议用支持更新/删除的向量库服务。

