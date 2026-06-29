
const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

/*
========================
GROUP CHAT
========================
*/

router.get("/:room", protect, async (req, res) => {
  try {

    const messages = await Message.find({

      room: req.params.room,

      messageType: "group"

    })

      .sort({ createdAt: 1 })

      .limit(100);

    res.json(messages);

  } catch (error) {

    res.status(500).json({

      message: "Server error",

      error: error.message,

    });

  }

});


/*
========================
PRIVATE CHAT
========================
*/

router.get(

  "/private/:userId",

  protect,

  async (req, res) => {

    try {

      const currentUser = req.user._id;

      const otherUser = req.params.userId;

      const messages = await Message.find({

        $or: [

          {

            sender: currentUser,

            receiver: otherUser,

            messageType: "private",

          },

          {

            sender: otherUser,

            receiver: currentUser,

            messageType: "private",

          },

        ],

      })

        .sort({

          createdAt: 1,

        })

        .populate(

          "sender",

          "username"

        );

      res.json(messages);

    } catch (error) {

      res.status(500).json({

        message: "Server error",

        error: error.message,

      });

    }

  }

);

module.exports = router;

