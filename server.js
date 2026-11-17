require('dotenv').config();

const express = require('express');
const path = require('path');
const connectToDatabase = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use('/api/students', studentRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body must be 10 KB or smaller.' });
  }

  console.error('Request failed:', error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

async function startServer() {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error(`Could not connect to MongoDB: ${error.message}`);
    process.exitCode = 1;
    return null;
  }

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => {
    console.log(`Student Management System is running at http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      const mongoose = require('mongoose');
      mongoose.connection.close().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
