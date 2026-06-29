const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

router.get("/:room", protect, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;