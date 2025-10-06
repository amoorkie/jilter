const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Конфигурация
const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:8081';
const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://localhost:8080';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Admin Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Статистика сервиса
app.get('/api/stats', async (req, res) => {
  try {
    const response = await axios.get(`${DATABASE_SERVICE_URL}/api/stats`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vacancies endpoints
app.get('/api/vacancies', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    
    const response = await axios.get(`${DATABASE_SERVICE_URL}/api/vacancies`, {
      params: { page, limit, status, search }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение вакансий для модерации (pending)
app.get('/api/pending', async (req, res) => {
  try {
    const response = await axios.get(`${DATABASE_SERVICE_URL}/api/vacancies`, {
      params: { status: 'pending', limit: 100 }
    });
    
    res.json({
      vacancies: response.data.content || response.data,
      total: response.data.totalElements || response.data.length
    });
  } catch (error) {
    console.error('Error fetching pending vacancies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/vacancies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(`${process.env.DATABASE_SERVICE_URL}/api/vacancies/${id}`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/vacancies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const response = await fetch(`${process.env.DATABASE_SERVICE_URL}/api/vacancies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/vacancies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(`${process.env.DATABASE_SERVICE_URL}/api/vacancies/${id}`, {
      method: 'DELETE'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Moderation endpoints
app.post('/api/moderate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    
    const response = await fetch(`${process.env.DATABASE_SERVICE_URL}/api/vacancies/${id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error moderating vacancy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Парсинг endpoints
app.post('/api/parse', async (req, res) => {
  try {
    const { sources = ['geekjob', 'hh', 'habr'], pages = 2, query = 'дизайнер' } = req.body;
    
    const response = await axios.post(`${PARSER_SERVICE_URL}/api/parse`, {
      sources,
      pages,
      query
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error starting parsing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/parse/geekjob', async (req, res) => {
  try {
    const { query = 'дизайнер', pages = 2 } = req.body;
    
    const response = await axios.post(`${PARSER_SERVICE_URL}/api/parse/geekjob`, {
      query,
      pages
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error parsing Geekjob:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/parse/hh', async (req, res) => {
  try {
    const { query = 'дизайнер', pages = 2 } = req.body;
    
    const response = await axios.post(`${PARSER_SERVICE_URL}/api/parse/hh`, {
      query,
      pages
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error parsing HH.ru:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/parse/habr', async (req, res) => {
  try {
    const { query = 'дизайнер', pages = 2 } = req.body;
    
    const response = await axios.post(`${PARSER_SERVICE_URL}/api/parse/habr`, {
      query,
      pages
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error parsing Habr:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI обработка endpoints
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/analyze`, {
      text
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error analyzing text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ai/clean', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/clean`, {
      text
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error cleaning text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ai/format', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/format`, {
      text
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error formatting text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Нормализация текста
app.post('/api/normalize', async (req, res) => {
  try {
    const { vacancyId } = req.body;
    
    // Получаем вакансию
    const vacancyResponse = await axios.get(`${DATABASE_SERVICE_URL}/api/vacancies/${vacancyId}`);
    const vacancy = vacancyResponse.data;
    
    // Очищаем текст
    const cleanResponse = await axios.post(`${AI_SERVICE_URL}/api/clean`, {
      text: vacancy.fullDescription || vacancy.description
    });
    
    // Форматируем текст
    const formatResponse = await axios.post(`${AI_SERVICE_URL}/api/format`, {
      text: cleanResponse.data.cleaned_text
    });
    
    // Обновляем вакансию
    const updateResponse = await axios.put(`${DATABASE_SERVICE_URL}/api/vacancies/${vacancyId}`, {
      ...vacancy,
      description: formatResponse.data.description,
      requirements: formatResponse.data.requirements,
      tasks: formatResponse.data.tasks,
      benefits: formatResponse.data.benefits,
      conditions: formatResponse.data.conditions,
      needsFormatting: false
    });
    
    res.json({
      success: true,
      vacancy: updateResponse.data
    });
  } catch (error) {
    console.error('Error normalizing text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
