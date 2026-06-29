const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Message = require("./models/Message");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Chat API is running...");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New socket connected:", socket.id);

  socket.on("user-online", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on("send-message", async (data) => {
    try {
      const { sender, senderName, room, text } = data;

      const newMessage = await Message.create({
        sender,
        senderName,
        room,
        text,
      });

      io.to(room).emit("receive-message", newMessage);
    } catch (error) {
      console.error("Error saving message:", error.message);
    }
  });

  socket.on("typing", ({ room, senderName }) => {
    socket.to(room).emit("typing", senderName);
  });

  socket.on("stop-typing", ({ room }) => {
    socket.to(room).emit("stop-typing");
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("online-users", Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});