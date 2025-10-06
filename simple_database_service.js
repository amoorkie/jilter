const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Database Service',
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

app.post('/api/vacancies/:id/moderate', (req, res) => {
  res.json({
    success: true,
    message: 'Vacancy moderated'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Database Service running on port ${PORT}`);
});





