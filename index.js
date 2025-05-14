const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 从环境变量中获取API密钥和模型ID
// 在Cloud Run部署时，你需要配置这些环境变量
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_MODEL_ID = process.env.DOUBAO_MODEL_ID || 'doubao-1.5-pro-32k-250115'; // 默认模型ID
const DOUBAO_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// AI代理端点
app.post('/api/proxy/doubao', async (req, res) => {
  if (!DOUBAO_API_KEY) {
    console.error('Error: DOUBAO_API_KEY is not configured.');
    return res.status(500).json({ error: 'AI service not configured: API key missing.' });
  }

  try {
    const requestData = req.body; // 前端发送过来的请求体
    
    // console.log('Received request for Doubao proxy:', requestData);

    // 构造向豆包API的请求
    const doubaoResponse = await axios.post(DOUBAO_API_BASE_URL, {
      model: DOUBAO_MODEL_ID,
      messages: requestData.messages, // 假设前端会传来 messages 数组
      stream: requestData.stream || false, // 是否流式输出，默认为false
      // 根据豆包API文档，可以传递其他参数，例如 temperature, top_p 等
      // 我们直接透传前端的参数，或者在这里设定一些默认值/限制
      temperature: requestData.temperature,
      top_p: requestData.top_p,
      max_tokens: requestData.max_tokens,
      // ... 其他豆包API支持的参数
    }, {
      headers: {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    // console.log('Received response from Doubao API:', doubaoResponse.data);
    res.status(doubaoResponse.status).json(doubaoResponse.data);

  } catch (error) {
    console.error('Error proxying to Doubao API:', error.response ? error.response.data : error.message);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: 'Error calling Doubao API.', 
        details: error.response.data 
      });
    } else {
      res.status(500).json({ error: 'Internal server error while proxying to AI service.' });
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AI Proxy Service listening on port ${PORT}`);
}); 