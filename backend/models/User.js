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
    sparse: true,
    unique: true
  },
  autoId: {
    type: String,
    sparse: true,
    unique: true
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
  },
  // Driver-specific fields
  currentRides: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideRequest'
  }],
  capacity: {
    type: Number,
    default: 6
  },
  availableSeats: {
    type: Number,
    default: 6
  }
}, {
  timestamps: true
});

// ✅ FIX: Add proper password hashing
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

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

// Method to check if driver has available seats
userSchema.methods.hasAvailableSeats = function() {
  return this.availableSeats > 0;
};

// Method to occupy a seat
userSchema.methods.occupySeat = async function() {
  if (this.availableSeats > 0) {
    this.availableSeats -= 1;
    await this.save();
    return true;
  }
  return false;
};

// Method to free a seat
userSchema.methods.freeSeat = async function() {
  if (this.availableSeats < this.capacity) {
    this.availableSeats += 1;
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);








