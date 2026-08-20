const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      enum: ['direct', 'community'],
      default: 'direct'
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    avatar: {
      type: String,
      default: ''
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Only applicable for communities
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
