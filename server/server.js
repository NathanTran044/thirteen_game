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
// const ALL_CARDS = ["3", "3", "4", "4", "5", "5", "6", "2", "2", "2", "2", "2", "2"]
//   .flatMap((c) => ["S", "C", "D", "H"].map((s) => `${c}${s}`));

const gameSessions = {}; // Store game states
const playerNames = {}; // Store player names

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

// Checks if all the cards have same value
const allSame = (cards) => {
  const firstValue = cards[0].slice(0, -1);

  for (let card of cards) {
    if (card.slice(0, -1) !== firstValue) {
      return false;
    }
  }
  return true;
};

const validStraight = (cards) => {
  const order = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const values = cards.map(card => card.slice(0, -1));

  if (values.includes("2")) return false;

  values.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  for (let i = 1; i < values.length; i++) {
    if (order.indexOf(values[i]) !== order.indexOf(values[i - 1]) + 1) {
      return false; // Not consecutive
    }
  }

  return true;
};

const validDoubleStraight = (cards) => {
  if (cards.length < 6 || cards.length % 2 != 0) {
    return false;
  }

  const order = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const values = cards.map(card => card.slice(0, -1));

  if (values.includes("2")) return false;

  values.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  // check pairs
  for (let i = 0; i < values.length; i += 2) {
    if (order.indexOf(values[i]) !== order.indexOf(values[i + 1])) {
      return false;
    }
  }

  // check consecutive
  for (let i = 2; i < values.length; i += 2) {
    if (order.indexOf(values[i]) !== order.indexOf(values[i - 1]) + 1) {
      return false;
    }
  }

  return true;
};

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log(`Received event: ${event}`, args);
  });

  socket.on("join_room", ({ username, room }, callback) => {
    const roomName = String(room);

    for (let gameId in gameSessions) {
      let game = gameSessions[gameId]; // Get the game session object
      if (game.room == roomName) {
        socket.emit("invalid_move", { message: "Cannot join room. Game in progress." });
        return;
      }
    }

    socket.join(roomName);
    console.log("joining room ", roomName)
    socket.room = roomName;

    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`User ${socket.id} joined room: ${roomName}, Total users: ${roomSize}`);

    playerNames[socket.id] = username;

    const gameId = uuidv4();
    io.to(roomName).emit("room_info_update", { roomSize, gameId });

    callback(true, roomSize, socket.id);
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("start_game", ({ num_players, room }) => {
    if (!room || num_players <= 1 || num_players > 4) {
      console.log("Invalid game start request:", { num_players, room });
      return;
    }

    const player_cards = dealCards(num_players);
    if (!player_cards) {
      console.log("Failed to deal cards");
      return;
    }

    // Emit begin game and game state update to only players in the room
    io.to(room).emit("begin_game");

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
        skipped: false,
        finished: false
      });

      console.log("Sending player hand to " + socketId);
      io.to(socketId).emit("player_hand", player_cards[index]);
    });

    // Assign the first turn to the player with the lowest card
    gameSessions[gameId].currentPlayerIndex = firstPlayerIndex;
    gameSessions[gameId].lastPlayedIndex = firstPlayerIndex;
    gameSessions[gameId].players[firstPlayerIndex].isTurn = true;

    io.to(room).emit("game_state_update", {
      gameId,
      currentTurn: playerNames[gameSessions[gameId].players[gameSessions[gameId].currentPlayerIndex].id],
    });

    io.sockets.adapter.rooms.get(room).forEach((socketId) => {
      console.log(`Sent game_state_update to socket: ${socketId}`);
      console.log(gameSessions);
    });
  });

  socket.on("play_card", ({ gameId, selectedCard }) => {
    console.log("RUNNING play_card");
    console.log(gameSessions);
    console.log(gameSessions[gameId]);
    console.log(gameId);
    for (let player of gameSessions[gameId].players) {
      console.log(player);
    }
    console.log("gameId " + gameId + " selectedCard: " + selectedCard);

    if (!gameId || !gameSessions[gameId]) {
      console.log("no gameId provided or gameId not found in gameSessions")
      return;
    }
  
    let game = gameSessions[gameId];
    let currentPlayer = game.players[game.currentPlayerIndex];
    console.log("current player is " + String(currentPlayer.id))
  
    if (socket.id !== currentPlayer.id) {
      console.log("Not player's turn");
      socket.emit("invalid_move", { message: "Not your turn!" });
      return;
    }

    // Check if player plays nothing
    if (selectedCard == "") {
      socket.emit("invalid_move", { message: "Must play a card or pass" });
      return;
    }

    // If a player passes
    if (selectedCard == "pass") {
      currentPlayer.skipped = true;

      // Check if all active players passed, only happens after a player has finished and all next players pass leading to free turn
      const activePlayers = game.players.filter(p => !p.finished);
      let allPassed = false;
      if (activePlayers.every(p => p.skipped)) {
        console.log("All active players skipped. Resetting round...");

        // Move index to player who finished
        game.currentPlayerIndex = game.lastPlayedIndex;
        game.lastPlayedCard = "";
        
        // Reset skips for the next round
        activePlayers.forEach(p => (p.skipped = false));
        allPassed = true;
      }

      do {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      } while (game.players[game.currentPlayerIndex].skipped || game.players[game.currentPlayerIndex].finished);

      // need to let next player play any card if everone passed
      if (allPassed) {
        game.lastPlayedIndex = game.currentPlayerIndex;
      }

      if (game.lastPlayedIndex == game.currentPlayerIndex) {
        game.lastPlayedCard = ""
      }
  
      io.to(game.room).emit("game_state_update", {
        gameId,
        currentTurn: playerNames[game.players[game.currentPlayerIndex].id],
        lastPlayedCard: game.lastPlayedCard
      });
      return;
    }
  
    // Split the cards
    const cards = selectedCard.split(" ").sort(cardSort);

    // Win if all cards are 2 or douple-trips
    if (
      cards.length === 4 && cards.every(card => card.slice(0, -1) === "2")
    ) {
      currentPlayer.finished = true;
      io.to(game.room).emit("player_finished", { finished: playerNames[socket.id] });

      if (game.players.filter(p => !p.finished).length === 1) {
        const lastPlayer = game.players.find(p => !p.finished);
        io.to(game.room).emit("game_over", { finished: playerNames[lastPlayer.id] });
        delete gameSessions[gameId];
        return;
      }
    }
    else if (game.lastPlayedIndex == game.currentPlayerIndex) { // Check if its open play
      console.log("Free to play!");
      // Reset all skips
      for (let player of game.players) {
        player.skipped = false;
      }

      // Check if card combination is valid
      const numCards = cards.length
      switch (numCards) {
        case 1:
          break;
        case 2:
          if (!allSame(cards)) {
            socket.emit("invalid_move", { message: "Cannot play that" });
            return;
          }
          break;
        case 3:
        case 4:
          if (!allSame(cards) && !validStraight(cards)) {
            socket.emit("invalid_move", { message: "Cannot play that" });
            return;
          }
          break;
        case 5:
        case 7:
        case 9:
        case 11:
        case 13:
          if (!validStraight(cards)) {
            socket.emit("invalid_move", { message: "Cannot play that" });
            return;
          }
          break;
        case 6:
        case 8:
        case 10:
        case 12:
          if (!validStraight(cards) && !validDoubleStraight(cards)) {
            socket.emit("invalid_move", { message: "Cannot play that" });
            return;
          }
          break;
      }
    } else { // Have to follow current pattern
      console.log("Must follow patern");
      previousCards = game.lastPlayedCard.split(" ")

      if (
        previousCards.length == 1 && 
        previousCards[0].slice(0, -1) === "2" && 
        ((cards.length == 4 && allSame(cards)) || (cards.length == 6 && validDoubleStraight(cards)))) {
          // bomb on a 2, falls through
      }
      else if (allSame(previousCards)) {
        if (
          cards.length != previousCards.length || 
          !allSame(cards) || 
          cardSort(cards[cards.length - 1], previousCards[previousCards.length - 1]) < 0
        ) {
          socket.emit("invalid_move", { message: "Cannot play that" });
          return;
        }
      } else if (validStraight(previousCards)) {
        if (
          cards.length != previousCards.length ||
          !validStraight(cards) ||
          cardSort(cards[cards.length - 1], previousCards[previousCards.length - 1]) < 0
        ) {
          socket.emit("invalid_move", { message: "Cannot play that" });
          return;
        }
      } else if (validDoubleStraight(previousCards)) {
        if (
          cards.length != previousCards.length ||
          !validDoubleStraight(cards) ||
          cardSort(cards[cards.length - 1], previousCards[previousCards.length - 1]) < 0
        ) {
          socket.emit("invalid_move", { message: "Cannot play that" });
          return;
        }
      }
    }
    
  
    // Play the selectedCard
    currentPlayer.hand = currentPlayer.hand.filter((c) => !cards.includes(c));
    game.lastPlayedCard = selectedCard;
    game.lastPlayedIndex = game.currentPlayerIndex;

    io.to(currentPlayer.id).emit("player_hand", currentPlayer.hand);
  
    // Check if the player has won
    if (currentPlayer.hand.length === 0) {
      currentPlayer.finished = true;
      io.to(game.room).emit("player_finished", { finished: playerNames[socket.id] });
      
      // Check if only one player remains
      if (game.players.filter(p => !p.finished).length === 1) {
        const lastPlayer = game.players.find(p => !p.finished);
        io.to(game.room).emit("game_over", { finished: playerNames[lastPlayer.id] });
        delete gameSessions[gameId];
        return;
      }
    }
  
    // Move to next player
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    } while (game.players[game.currentPlayerIndex].skipped || game.players[game.currentPlayerIndex].finished);
  
    io.to(game.room).emit("game_state_update", {
      gameId,
      currentTurn: playerNames[game.players[game.currentPlayerIndex].id],
      lastPlayedCard: game.lastPlayedCard
    });

    console.log("finished playing selectedCard");
  });

  socket.on("leave_room", () => {
    console.log(`User Disconnected: ${socket.id}`);

    const room = socket.room;

    // leave room
    socket.leave(socket.room);
    
    // make all sockets in room leave
    io.to(room).emit("force_disconnect");
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    if (socketsInRoom) {
        socketsInRoom.forEach((socketId) => {
            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
                console.log(`Forcing ${socketId} to leave room ${room}`);
                playerSocket.leave(room); // Make them leave
            }
        });
    }

    // delete game session from gameSessions
    for (let gameId in gameSessions) {
      if (gameSessions[gameId].room === room) {
          delete gameSessions[gameId];
          break;
      }
  }
    // if (socket.room) {
    //   let roomSize = io.sockets.adapter.rooms.get(socket.room)?.size || 0;
    //   roomSize = roomSize - 1;

    //   // update old room's size
    //   const gameId = uuidv4();
    //   io.to(socket.room).emit("room_info_update", { roomSize, gameId });

    //   // game in empty room needs to be stopped
    //   if (roomSize == 0) {
    //     for (let gameId in gameSessions) {
    //       let game = gameSessions[gameId]; // Get the game session object
    //       if (game.room == socket.room) {
    //         delete gameSessions[gameId];
    //         break;
    //       }
    //     }
    //   }
    //   socket.leave(socket.room);
    // }
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
