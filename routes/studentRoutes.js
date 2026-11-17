const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');

const router = express.Router();
const allowedFields = ['name', 'email', 'course', 'age'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStudentInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const keys = Object.keys(body);
  const unknownFields = keys.filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    return `Unsupported field(s): ${unknownFields.join(', ')}.`;
  }
  if (partial && keys.length === 0) {
    return 'Provide at least one student field to update.';
  }

  const requiredFields = partial ? keys : allowedFields;
  for (const field of requiredFields) {
    const value = body[field];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      return `${field[0].toUpperCase()}${field.slice(1)} is required.`;
    }
  }

  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length > 100)) {
    return 'Name must be a string of 100 characters or fewer.';
  }
  if (body.email !== undefined && (
    typeof body.email !== 'string' ||
    body.email.trim().length > 254 ||
    !emailPattern.test(body.email.trim())
  )) {
    return 'Enter a valid email address.';
  }
  if (body.course !== undefined && (
    typeof body.course !== 'string' ||
    body.course.trim().length > 120
  )) {
    return 'Course must be a string of 120 characters or fewer.';
  }
  if (body.age !== undefined && (
    typeof body.age !== 'number' ||
    !Number.isInteger(body.age) ||
    body.age < 1 ||
    body.age > 120
  )) {
    return 'Age must be a whole number between 1 and 120.';
  }

  return null;
}

function sendDatabaseError(error, res) {
  if (error.code === 11000) {
    return res.status(409).json({
      message: 'A student with this email address already exists.'
    });
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }

  console.error('Student database operation failed:', error);
  return res.status(500).json({ message: 'An unexpected database error occurred.' });
}

function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Student ID must be a valid MongoDB ObjectId.' });
  }
  return next();
}

router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    return res.json(students);
  } catch (error) {
    return sendDatabaseError(error, res);
  }
});

router.post('/', async (req, res) => {
  const validationError = validateStudentInput(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const student = await Student.create(req.body);
    return res.status(201).json(student);
  } catch (error) {
    return sendDatabaseError(error, res);
  }
});

router.get('/:id', validateId, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json(student);
  } catch (error) {
    return sendDatabaseError(error, res);
  }
});

router.put('/:id', validateId, async (req, res) => {
  const validationError = validateStudentInput(req.body, true);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json(student);
  } catch (error) {
    return sendDatabaseError(error, res);
  }
});

router.delete('/:id', validateId, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json({ message: 'Student deleted successfully.', student });
  } catch (error) {
    return sendDatabaseError(error, res);
  }
});

module.exports = router;
