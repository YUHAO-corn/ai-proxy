const express = require('express');
const axios = require('axios');
const cors = require('cors'); // 引入cors包

const app = express();

// --- 精准的CORS配置 ---
// 定义允许的来源列表
const allowedOrigins = [
  'https://aetherflow-app.com',
  'https://aetherflow-app.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // 如果扩展程序有固定的来源ID，也应该加在这里
  // 'chrome-extension://your-extension-id' 
];

// 配置CORS选项
const corsOptions = {
  origin: function (origin, callback) {
    // 对于非浏览器请求（如服务器到服务器、Postman等），origin是undefined
    // 允许没有origin的请求（或在白名单中的请求）
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked origin -> ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'], // 我们只需要允许GET, POST, OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'], // 明确指定允许的头
  credentials: true
};

// 应用CORS中间件
app.use(cors(corsOptions));

// 为所有路由启用OPTIONS预检请求的自动处理
app.options('*', cors(corsOptions)); 

// 日志中间件 - 打印所有接收到的请求
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  next();
});

app.use(express.json());

// 环境变量和API配置 - 更新为通义千问 (Qwen)
// 在Cloud Run部署时，你需要配置这些新的环境变量
const QWEN_API_KEY = process.env.QWEN_API_KEY; // 或者 DASHSCOPE_API_KEY，取决于你如何命名
const QWEN_MODEL_ID = process.env.QWEN_MODEL_ID || 'qwen-plus'; // 默认使用 qwen-plus，文档示例中是这个
const QWEN_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 健康检查端点
app.get('/health', (req, res) => {
  console.log('Handling /health request'); // 新增日志
  res.status(200).send('OK from health check'); // 修改返回信息以便区分
});

// AI代理端点 - 更新为通义千问 (Qwen)
app.post('/api/proxy/qwen', async (req, res) => { // 更改端点路径以反映模型变化 (可选但推荐)
  console.log('Handling /api/proxy/qwen request'); 
  if (!QWEN_API_KEY) {
    console.error('Error: QWEN_API_KEY is not configured.');
    return res.status(500).json({ error: 'AI service not configured: API key missing.' });
  }

  try {
    const requestData = req.body; 
    
    console.log('Request body for Qwen proxy:', JSON.stringify(requestData, null, 2));

    // 构造向通义千问API的请求
    const qwenResponse = await axios.post(QWEN_API_BASE_URL, {
      model: QWEN_MODEL_ID, // 使用Qwen的模型ID
      messages: requestData.messages, 
      stream: requestData.stream || false, 
      temperature: requestData.temperature,
      top_p: requestData.top_p,
      max_tokens: requestData.max_tokens, // 注意：Qwen API文档中没有明确列出max_tokens，但兼容OpenAI的接口通常支持。如果出错，可能需要移除或查阅更详细的Qwen参数文档。
      // parameters: requestData.parameters // Qwen 可能有自己独特的参数结构，比如放在 parameters 对象里，具体需查阅其详细API文档
    }, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Received response from Qwen API. Status:', qwenResponse.status);
    res.status(qwenResponse.status).json(qwenResponse.data);

  } catch (error) {
    console.error('Error proxying to Qwen API. Message:', error.message);
    if (error.response) {
      console.error('Qwen API Error Status:', error.response.status);
      console.error('Qwen API Error Data:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json({ 
        error: 'Error calling Qwen API.', 
        details: error.response.data 
      });
    } else {
      res.status(500).json({ error: 'Internal server error while proxying to AI service.' });
    }
  }
});

// 通配符路由 - 捕获所有未被其他路由处理的请求
app.all('*', (req, res) => {
  console.log(`Unhandled request by defined routes: ${req.method} ${req.url}`);
  res.status(404).send('Custom Page Not Found by App - Route not handled');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AI Proxy Service with enhanced logging listening on port ${PORT}`);
}); 

// Force redeploy
