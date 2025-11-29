const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  point: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Track seating order for capacity management
  requestOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add index for better query performance
rideRequestSchema.index({ student: 1, status: 1 });
rideRequestSchema.index({ point: 1, status: 1 });
rideRequestSchema.index({ driver: 1, status: 1 });

module.exports = mongoose.model('RideRequest', rideRequestSchema);