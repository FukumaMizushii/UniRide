const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'driver'],
    required: true
  },
  studentId: {
    type: String,
    sparse: true
  },
  autoId: {
    type: String,
    sparse: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ FIX: Add proper password hashing
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return; // no next()

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// ✅ FIX: Proper password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

module.exports = mongoose.model('User', userSchema);