const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AI Service',
    timestamp: new Date().toISOString()
  });
});

// AI endpoints
app.post('/api/analyze', (req, res) => {
  const { text } = req.body;
  res.json({
    relevance: 0.8,
    category: 'design',
    confidence: 0.9
  });
});

app.post('/api/clean', (req, res) => {
  const { text } = req.body;
  res.json({
    cleaned_text: text.replace(/<[^>]*>/g, '').trim()
  });
});

app.post('/api/format', (req, res) => {
  const { text } = req.body;
  res.json({
    description: text,
    requirements: 'Sample requirements',
    tasks: 'Sample tasks',
    benefits: 'Sample benefits',
    conditions: 'Sample conditions'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Service running on port ${PORT}`);
});






