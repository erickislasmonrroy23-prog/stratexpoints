import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/claude', async (req, res) => {
  try {
    const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 4000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API Error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Claude API request failed' 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-super-admin', async (req, res) => {
  try {
    const { code, userId } = req.body;
    const correctCode = process.env.SUPER_ADMIN_SECRET_CODE;
    
    if (code === correctCode) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid code' });
    }
  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});