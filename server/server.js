const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (room, callback) => {
    socket.join(room);
    socket.room = room;
    
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    console.log(`User ${socket.id} joined room: ${room}, Total users: ${roomSize}`);
        
    io.to(room).emit("room_size_update", roomSize);
    
    // Send the updated room size back to the joining user
    callback(true, roomSize);
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
    if (socket.room) {
        const room = socket.room;
        socket.leave(room);

        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to(room).emit("room_size_update", roomSize);
        console.log(`Updated room size for ${room}: ${roomSize}`);
    }
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
