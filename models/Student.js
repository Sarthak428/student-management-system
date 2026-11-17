const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer.']
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must be 254 characters or fewer.'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.']
    },
    course: {
      type: String,
      required: [true, 'Course is required.'],
      trim: true,
      maxlength: [120, 'Course must be 120 characters or fewer.']
    },
    age: {
      type: Number,
      required: [true, 'Age is required.'],
      min: [1, 'Age must be at least 1.'],
      max: [120, 'Age must be 120 or less.'],
      validate: {
        validator: Number.isInteger,
        message: 'Age must be a whole number.'
      }
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

studentSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    name: 'email_unique_non_null'
  }
);

module.exports = mongoose.model('Student', studentSchema);
