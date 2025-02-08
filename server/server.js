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
  .flatMap((c) => ["S", "C", "D", "H"].map((s) => `${c}${s}`));

const gameSessions = {}; // Store game states

const cardSort = (a, b) => {
  const ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
  const suits = ["S", "C", "D", "H"]; // Define suit priority
  
  const rankA = ranks.indexOf(a.slice(0, -1));
  const rankB = ranks.indexOf(b.slice(0, -1));

  if (rankA !== rankB) return rankA - rankB; // Sort by rank first
  
  return suits.indexOf(a.slice(-1)) - suits.indexOf(b.slice(-1)); // Sort by suit if ranks are equal
};

// Function to deal cards
const dealCards = (numPlayers) => {
  if (numPlayers < 2 || numPlayers > 4) return null;
  let deck = [...ALL_CARDS];
  
  // Sort deck
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return Array.from({ length: numPlayers }, (_, i) =>
    deck.slice(i * CARDS_PER_PLAYER, (i + 1) * CARDS_PER_PLAYER).sort(cardSort)
  );
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

    callback(true, roomSize, socket.id);
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

    const gameId = uuidv4();
    gameSessions[gameId] = {
      players: [],
      currentPlayerIndex: 0,
      room,
      lastPlayedCard: null,
      lastPlayedIndex: 0
    };
  
    const roomPlayers = Array.from(io.sockets.adapter.rooms.get(room) || []);
    let lowestCard = null;
    let firstPlayerIndex = 0;

    roomPlayers.forEach((socketId, index) => {
      // Find the lowest card in the game
      if (!lowestCard || cardSort(player_cards[index][0], lowestCard) < 0) {
        lowestCard = player_cards[index][0];
        firstPlayerIndex = index;
      }

      gameSessions[gameId].players.push({
        id: socketId,
        hand: player_cards[index],
        isTurn: false,
        skipped: false
      });

      io.to(socketId).emit("player_hand", player_cards[index]);
    });

    // Assign the first turn to the player with the lowest card
    gameSessions[gameId].currentPlayerIndex = firstPlayerIndex;
    gameSessions[gameId].lastPlayedIndex = firstPlayerIndex;
    gameSessions[gameId].players[firstPlayerIndex].isTurn = true;

    // Emit begin game and game state update to only players in the room
    io.to(room).emit("begin_game");
    io.to(room).emit("game_state_update", {
      gameId,
      current_turn: gameSessions[gameId].players[firstPlayerIndex].id,
    });

    io.sockets.adapter.rooms.get(room).forEach((socketId) => {
      console.log(`Sent game_state_update to socket: ${socketId}`);
      console.log(gameSessions);
    });
  });

  socket.on("play_card", ({ gameId, selectedCard }) => {
    console.log("game sessions: ");
    console.log(gameSessions);
    console.log("gameId " + gameId + " selectedCard: " + selectedCard);

    if (!gameId || !gameSessions[gameId]) {
      console.log("no gameId provided or gameId not found in gameSessions")
      return;
    }
  
    let game = gameSessions[gameId];
    let currentPlayer = game.players[game.currentPlayerIndex];
  
    if (socket.id !== currentPlayer.id) {
      console.log("not player's turn")
      socket.emit("invalid_move", { message: "Not your turn!" });
      return;
    }
  
    // Validate if player has the selectedCard
    if (!currentPlayer.hand.includes(selectedCard)) {
      console.log("selectedCard being played not found")
      socket.emit("invalid_move", { message: "card not in hand!" });
      return;
    }
  
    // Play the selectedCard
    currentPlayer.hand = currentPlayer.hand.filter((c) => c !== selectedCard);
    game.lastPlayedCard = selectedCard;
    game.lastPlayedIndex = game.currentPlayerIndex;

    io.to(currentPlayer.id).emit("player_hand", currentPlayer.hand);
  
    // Check if the player has won
    if (currentPlayer.hand.length === 0) {
      io.to(game.room).emit("game_over", { winner: socket.id });
      delete gameSessions[gameId];
      return;
    }
  
    // Move to next player
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  
    io.to(game.room).emit("game_state_update", {
      gameId,
      current_turn: game.players[game.currentPlayerIndex].id,
    });

    console.log("finished playing selectedCard");
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
