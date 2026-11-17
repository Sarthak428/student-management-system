const mongoose = require('mongoose');
const Student = require('../models/Student');

async function connectToDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured. Add it to your .env file.');
  }

  await mongoose.connect(uri, {
    dbName: 'StudentDB',
    serverSelectionTimeoutMS: 5000
  });
  try {
    await Student.init();
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }

  console.log(`Connected to MongoDB database "${mongoose.connection.name}".`);
  return mongoose.connection;
}

module.exports = connectToDatabase;
