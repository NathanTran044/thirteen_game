const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json()); // Needed to parse JSON in POST requests

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Constants
const CARDS_PER_PLAYER = 13;
const ALL_CARDS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
  .flatMap((c) => ["S", "C", "D", "H"].map((s) => `${c} ${s}`));

const gameSessions = {}; // Store game states

// Function to deal cards
const dealCards = (numPlayers) => {
  if (numPlayers < 1 || numPlayers > 4) return null;
  let deck = [...ALL_CARDS];
  deck.sort(() => Math.random() - 0.5); // Shuffle deck
  return Array.from({ length: numPlayers }, (_, i) => deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER));
};

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log(`Received event: ${event}`, args);
  });

  socket.on("join_room", (room, callback) => {
    const roomName = String(room);

    if (socket.room) {
      console.log(`User ${socket.id} leaving previous room: ${socket.room}`);
      socket.leave(socket.room);
    }

    socket.join(roomName);
    console.log("joining room ", roomName, typeof(room))
    socket.room = roomName;

    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`User ${socket.id} joined room: ${roomName}, Total users: ${roomSize}`);

    const gameId = uuidv4();
    io.to(roomName).emit("room_info_update", { roomSize, gameId });

    callback(true, roomSize);
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("start_game", ({ num_players, room }) => {
    if (!room || num_players < 1 || num_players > 4) {
      console.log("Invalid game start request:", { num_players, room });
      return;
    }

    const player_cards = dealCards(num_players);
    if (!player_cards) {
      console.log("Failed to deal cards");
      return;
    }

    const game_id = uuidv4();
    gameSessions[game_id] = player_cards;

    // Emit game state update to only players in the room
    io.to(room).emit("game_state_update", { game_id, player_cards });

    io.sockets.adapter.rooms.get(room).forEach((socketId) => {
      console.log(`Sent game_state_update to socket: ${socketId}`);
    });
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
    if (socket.room) {
      const room = socket.room;
      socket.leave(room);

      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      if (roomSize > 0) {
        const gameId = uuidv4();
        io.to(room).emit("room_info_update", { roomSize, gameId });
      }
    }
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
