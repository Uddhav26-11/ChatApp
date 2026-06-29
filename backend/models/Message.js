const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    senderName: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      default: "general",
    },
    text: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["group", "private"],
      default: "group",
    },
    // ── Reactions ──
    reactions: {
      type: Map,
      of: [String], // { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);