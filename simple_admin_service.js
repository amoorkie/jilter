const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Admin Service',
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    totalVacancies: 0,
    pendingVacancies: 0,
    approvedVacancies: 0,
    rejectedVacancies: 0
  });
});

// Vacancies endpoints
app.get('/api/vacancies', (req, res) => {
  res.json({
    content: [],
    totalElements: 0,
    totalPages: 0,
    currentPage: 1
  });
});

app.get('/api/pending', (req, res) => {
  res.json({
    vacancies: [],
    total: 0
  });
});

app.get('/api/vacancies/:id', (req, res) => {
  res.json({
    id: req.params.id,
    title: 'Sample Vacancy',
    company: 'Sample Company',
    status: 'pending'
  });
});

app.put('/api/vacancies/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Vacancy updated'
  });
});

app.delete('/api/vacancies/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Vacancy deleted'
  });
});

app.post('/api/moderate/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Vacancy moderated'
  });
});

// Parsing endpoints
app.post('/api/parse', (req, res) => {
  res.json({
    success: true,
    message: 'Parsing started',
    sources: req.body.sources || ['geekjob', 'hh', 'habr']
  });
});

app.post('/api/parse/geekjob', (req, res) => {
  res.json({
    success: true,
    message: 'Geekjob parsing completed',
    total_found: 8,
    saved: 8
  });
});

app.post('/api/parse/hh', (req, res) => {
  res.json({
    success: true,
    message: 'HH.ru parsing completed',
    total_found: 5,
    saved: 5
  });
});

app.post('/api/parse/habr', (req, res) => {
  res.json({
    success: true,
    message: 'Habr parsing completed',
    total_found: 4,
    saved: 4
  });
});

// AI endpoints
app.post('/api/ai/analyze', (req, res) => {
  res.json({
    relevance: 0.8,
    category: 'design',
    confidence: 0.9
  });
});

app.post('/api/ai/clean', (req, res) => {
  res.json({
    cleaned_text: req.body.text.replace(/<[^>]*>/g, '').trim()
  });
});

app.post('/api/ai/format', (req, res) => {
  res.json({
    description: req.body.text,
    requirements: 'Sample requirements',
    tasks: 'Sample tasks',
    benefits: 'Sample benefits',
    conditions: 'Sample conditions'
  });
});

app.post('/api/normalize', (req, res) => {
  res.json({
    success: true,
    message: 'Text normalized'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Service running on port ${PORT}`);
});





