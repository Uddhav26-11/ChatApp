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

const allowedOrigins = [
  "http://localhost:5173",
  "https://chat-app-eta-flax.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      // Postman ya direct requests ke liye
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS not allowed")
      );
    },

    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Chat API is running...");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  socket.on("user-online", (userId) => {

    onlineUsers.set(userId, socket.id);

    socket.userId = userId;

    io.emit(

      "online-users",

      Array.from(

        onlineUsers.keys()

      )

    );

  });

  socket.on(

    "join-room",

    (room) => {

      socket.join(room);

    }

  );

  socket.on(

    "send-message",

    async (data) => {

      try {

        const {

          sender,

          senderName,

          room,

          text

        } = data;

        const newMessage =

          await Message.create({

            sender,

            senderName,

            room,

            text

          });

        io.to(room).emit(

          "receive-message",

          newMessage

        );

      }

      catch (err) {

        console.log(err);

      }

    }

  );

  socket.on(

    "typing",

    ({ room, senderName }) => {

      socket.to(room)

      .emit(

        "typing",

        senderName

      );

    }

  );

  socket.on(

    "stop-typing",

    ({ room }) => {

      socket.to(room)

      .emit(

        "stop-typing"

      );

    }

  );

  socket.on(

    "disconnect",

    () => {

      if (

        socket.userId

      ) {

        onlineUsers.delete(

          socket.userId

        );

        io.emit(

          "online-users",

          Array.from(

            onlineUsers.keys()

          )

        );

      }

      console.log(

        "Disconnected:",

        socket.id

      );

    }

  );

});

const PORT =

  process.env.PORT

  ||

  5000;

server.listen(

  PORT,

  () => {

    console.log(

      `Server running on ${PORT}`

    );

  }

);