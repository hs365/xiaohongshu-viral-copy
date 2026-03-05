const { createServer } = require('http');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const PORT = process.env.PORT || 3000;

// SkillPay配置
const SKILL_ID = "0867e1ac-78e6-4d26-8e45-a365459c4108";
const API_KEY = "sk_939c573633ec6255d5faf911de763e9a2d127e51384a1ae403b271c746206a47";
const BILLING_API_URL = "https://skillpay.me/api/v1/billing";

const server = createServer((req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 首页 - 返回HTML
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = join(__dirname, 'index.html');
    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
  }

  // API接口
  if (req.url === '/api' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const user_id = data.user_id || 'anonymous';
        const topic = data.topic || data.message || '好物分享';
        
        // 调用SkillPay扣费
        const chargeResp = await fetch(`${BILLING_API_URL}/charge`, {
          method: 'POST',
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user_id,
            skill_id: SKILL_ID,
            amount: 0.01
          })
        });
        
        const chargeData = await chargeResp.json();
        
        if (!chargeData.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: '余额不足，请先充值',
            payment_url: chargeData.payment_url,
            balance: chargeData.balance || 0
          }));
          return;
        }
        
        // 生成文案
        const result = {
          success: true,
          message: '生成成功！',
          balance: chargeData.balance,
          hook: `姐妹们！${topic}也太香了吧！`,
          body: [
            `姐妹们！今天必须跟你们聊聊${topic}！`,
            '说实话一开始我也没当回事，直到...',
            '用了一段时间后真的惊到了！',
            '特别是最后一点，简直了！'
          ],
          cta: '你们觉得怎么样？评论区聊聊～',
          hashtags: [`#${topic}`, '#种草', '#真实分享', '#必看', '#好物推荐']
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
