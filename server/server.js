const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json()); // Needed to parse JSON in POST requests

// wakeup endpoint to start Render server
app.get('/wake-up', (req, res) => {
  res.status(200).json({ 
    message: 'Server is awake and ready!',
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://thirteen-game.vercel.app",
    // origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 5000, // Close connection if client doesn't respond to ping within 5s
  pingInterval: 10000 // Send a ping every 10s
});

// Constants
const CARDS_PER_PLAYER = 13;
const ALL_CARDS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
  .flatMap((c) => ["S", "C", "D", "H"].map((s) => `${c}${s}`));
// const ALL_CARDS = ["3", "3", "4", "4", "5", "5", "6", "2", "2", "2", "2", "2", "2"]
//   .flatMap((c) => ["S", "C", "D", "H"].map((s) => `${c}${s}`));

const gameSessions = {}; // Store game states
const playerNames = {}; // Store player names
const playerRooms = {}; // Track which room each socket is in

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

// Add this helper function before the socket.io event handlers
function restartGame(oldGame) {
  const room = oldGame.room;
  const numPlayers = oldGame.players.length;
  
  // Deal new cards
  const player_cards = dealCards(numPlayers);
  if (!player_cards) {
    console.log("Failed to deal cards for new game");
    return null;
  }

  // Create new game state
  const newGameId = uuidv4();
  const newGame = {
    players: [],
    currentPlayerIndex: 0,
    room,
    lastPlayedCard: null,
    lastPlayedIndex: 0,
    finishOrder: [] // Initialize empty finish order for new game
  };

  // Get room players in their current order
  const roomPlayers = oldGame.players.map(p => p.id);
  
  // Get the winner (first player to finish)
  const winner = oldGame.finishOrder[0];
  
  // Find the index of the winner in the room players array
  const firstPlayerIndex = roomPlayers.indexOf(winner);

  roomPlayers.forEach((socketId, index) => {
    newGame.players.push({
      id: socketId,
      hand: player_cards[index],
      isTurn: false,
      skipped: false,
      finished: false
    });

    // Send new hand to each player
    io.to(socketId).emit("player_hand", player_cards[index]);
  });

  // Assign the first turn to the winner of the last game
  newGame.currentPlayerIndex = firstPlayerIndex;
  newGame.lastPlayedIndex = firstPlayerIndex;
  newGame.players[firstPlayerIndex].isTurn = true;

  return { newGameId, newGame };
}

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.onAny((event, ...args) => {
    console.log(`Received event: ${event}`, args);
  });

  // Handle disconnections (both graceful and ungraceful)
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
    handlePlayerDisconnect(socket);
  });

  socket.on("join_room", ({ username, room }, callback) => {
    const roomName = String(room);

    // Check if player is already in a different room
    const currentRoom = playerRooms[socket.id];
    if (currentRoom && currentRoom !== roomName) {
      // Leave the current room
      socket.leave(currentRoom);
      console.log(`User ${socket.id} left room: ${currentRoom}`);
      
      // Update the old room's size for all players in that room
      const oldRoomSize = io.sockets.adapter.rooms.get(currentRoom)?.size || 0;
      io.to(currentRoom).emit("room_info_update", { roomSize: oldRoomSize });
      
      // Remove from tracking if needed
      delete playerRooms[socket.id];
    }

    for (let gameId in gameSessions) {
      let game = gameSessions[gameId];
      if (game.room == roomName) {
        socket.emit("invalid_move", { message: "Cannot join room. Game in progress." });
        return;
      }
    }

    const sizeBefore = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    if (sizeBefore == 4) {
      socket.emit("invalid_move", { message: "Cannot join room. Room is full." });
      return;
    }

    socket.join(roomName);
    console.log("joining room ", roomName);
    socket.room = roomName;
    playerRooms[socket.id] = roomName; // Track player's room

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

    // Get the current room players
    const roomPlayers = Array.from(io.sockets.adapter.rooms.get(room) || []);
    
    // Verify the actual number of players in the room
    if (roomPlayers.length !== num_players) {
      console.log(`Player count mismatch: expected ${num_players}, got ${roomPlayers.length}`);
      socket.emit("invalid_move", { message: "Player count mismatch. Please try again." });
      return;
    }

    const player_cards = dealCards(num_players);
    if (!player_cards) {
      console.log("Failed to deal cards");
      return;
    }

    // Create game session first
    const gameId = uuidv4();
    gameSessions[gameId] = {
      players: [],
      currentPlayerIndex: 0,
      room,
      lastPlayedCard: null,
      lastPlayedIndex: 0,
      finishOrder: [], // Add array to track finish order
      playersReady: 0   // Track how many players have received their cards
    };

    // Notify all players that game is starting
    io.to(room).emit("begin_game");

    // Add a small delay to ensure all clients have processed the begin_game event
    setTimeout(() => {
      let lowestCard = null;
      let firstPlayerIndex = 0;

      // Send cards to each player with acknowledgment
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

        console.log("Sending player hand to " + socketId, " with cards: ", player_cards[index]);
        
        // Send cards with acknowledgment
        io.sockets.sockets.get(socketId)?.emit("player_hand", player_cards[index], (ack) => {
          if (ack && ack.received) {
            // Increment the ready counter
            gameSessions[gameId].playersReady++;
            
            // If all players are ready, start the game
            if (gameSessions[gameId].playersReady === roomPlayers.length) {
              startGameAfterAllReady(gameId, firstPlayerIndex);
            }
          } else {
            console.log(`Player ${socketId} did not acknowledge receiving cards`);
            // Retry sending cards after a short delay
            setTimeout(() => {
              io.sockets.sockets.get(socketId)?.emit("player_hand", player_cards[index], (ack) => {
                if (ack && ack.received) {
                  gameSessions[gameId].playersReady++;
                  if (gameSessions[gameId].playersReady === roomPlayers.length) {
                    startGameAfterAllReady(gameId, firstPlayerIndex);
                  }
                }
              });
            }, 1000);
          }
        });
      });

      // Fallback: If not all players acknowledge within 5 seconds, start the game anyway
      setTimeout(() => {
        if (gameSessions[gameId] && gameSessions[gameId].playersReady < roomPlayers.length) {
          console.log(`Starting game ${gameId} after timeout with ${gameSessions[gameId].playersReady}/${roomPlayers.length} players ready`);
          startGameAfterAllReady(gameId, firstPlayerIndex);
        }
      }, 5000);
    }, 500);
  });

  // Helper function to start the game after all players are ready
  function startGameAfterAllReady(gameId, firstPlayerIndex) {
    // Check if game still exists (might have been cleaned up)
    if (!gameSessions[gameId]) return;
    
    // Check if game has already started
    if (gameSessions[gameId].gameStarted) return;
    
    // Mark game as started
    gameSessions[gameId].gameStarted = true;
    
    // Assign the first turn to the player with the lowest card
    gameSessions[gameId].currentPlayerIndex = firstPlayerIndex;
    gameSessions[gameId].lastPlayedIndex = firstPlayerIndex;
    gameSessions[gameId].players[firstPlayerIndex].isTurn = true;

    // Send the initial game state to all players
    io.to(gameSessions[gameId].room).emit("game_state_update", {
      gameId,
      currentTurn: playerNames[gameSessions[gameId].players[gameSessions[gameId].currentPlayerIndex].id],
      players: gameSessions[gameId].players.map(player => ({
        username: playerNames[player.id],
        cardCount: player.hand.length
      }))
    });
  }

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
      if (game.lastPlayedCard == null || game.lastPlayedCard == "") {
        socket.emit("invalid_move", { message: "Must play a card on a free turn." });
        return;
      }

      currentPlayer.skipped = true;
      io.to(game.room).emit("player_passed", {
        playerName: playerNames[currentPlayer.id]
      });

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

      // need to let next player play any card if everyone passed
      if (allPassed) {
        game.lastPlayedIndex = game.currentPlayerIndex;

        // Notify players that the round was won by the last player who played
        io.to(game.room).emit("all_passed", {
          playerName: playerNames[game.players[game.lastPlayedIndex].id]
        });
      }

      if (game.lastPlayedIndex == game.currentPlayerIndex) {
        game.lastPlayedCard = ""
        
        // If this is not part of the allPassed case (which already emits round_won),
        // emit round_won here as well
        if (!allPassed) {
          // Notify players that the round was won by the current player
          io.to(game.room).emit("round_won", {
            playerName: playerNames[game.players[game.currentPlayerIndex].id]
          });
        }
      }
  
      io.to(game.room).emit("game_state_update", {
        gameId,
        currentTurn: playerNames[game.players[game.currentPlayerIndex].id],
        lastPlayedCard: game.lastPlayedCard,
        players: game.players.map(player => ({
          username: playerNames[player.id],
          cardCount: player.hand.length
        }))
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
      game.finishOrder.push(currentPlayer.id); // Add player to finish order when they win
      io.to(game.room).emit("player_finished", { finished: playerNames[socket.id] });

      if (game.players.filter(p => !p.finished).length === 1) {
        const lastPlayer = game.players.find(p => !p.finished);
        game.finishOrder.push(lastPlayer.id); // Add last player to finish order
        
        // Create array of player names in finish order
        const finishOrderNames = game.finishOrder.map(playerId => playerNames[playerId]);
        
        io.to(game.room).emit("game_over", { 
          finished: playerNames[lastPlayer.id],
          finishOrder: finishOrderNames
        });
        
        // Restart the game
        const result = restartGame(game);
        if (!result) return;

        const { newGameId, newGame } = result;
        
        // Store new game and delete old one
        gameSessions[newGameId] = newGame;
        delete gameSessions[gameId];

        // Send new game state to all players
        io.to(game.room).emit("game_state_update", {
          gameId: newGameId,
          currentTurn: playerNames[newGame.players[newGame.currentPlayerIndex].id],
          lastPlayedCard: null,
          players: newGame.players.map(player => ({
            username: playerNames[player.id],
            cardCount: player.hand.length
          }))
        });

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
    game.lastPlayedCard = cards.join(" ");
    game.lastPlayedIndex = game.currentPlayerIndex;

    io.to(currentPlayer.id).emit("player_hand", currentPlayer.hand);
  
    // Check if the player has won
    if (currentPlayer.hand.length === 0) {
      currentPlayer.finished = true;
      game.finishOrder.push(currentPlayer.id); // Add player to finish order when they win
      io.to(game.room).emit("player_finished", { finished: playerNames[socket.id] });
      
      // Check if only one player remains
      if (game.players.filter(p => !p.finished).length === 1) {
        const lastPlayer = game.players.find(p => !p.finished);
        game.finishOrder.push(lastPlayer.id); // Add last player to finish order
        
        // Create array of player names in finish order
        const finishOrderNames = game.finishOrder.map(playerId => playerNames[playerId]);
        
        io.to(game.room).emit("game_over", { 
          finished: playerNames[lastPlayer.id],
          finishOrder: finishOrderNames
        });
        
        // Restart the game
        const result = restartGame(game);
        if (!result) return;

        const { newGameId, newGame } = result;
        
        // Store new game and delete old one
        gameSessions[newGameId] = newGame;
        delete gameSessions[gameId];

        // Send new game state to all players
        io.to(game.room).emit("game_state_update", {
          gameId: newGameId,
          currentTurn: playerNames[newGame.players[newGame.currentPlayerIndex].id],
          lastPlayedCard: null,
          players: newGame.players.map(player => ({
            username: playerNames[player.id],
            cardCount: player.hand.length
          }))
        });

        return;
      }
    }
  
    // Move to the next player
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    } while (game.players[game.currentPlayerIndex].skipped || game.players[game.currentPlayerIndex].finished);
    
    // Set the current player's turn
    game.players[game.currentPlayerIndex].isTurn = true;
    
    // Check if all other active players have passed
    checkAllOtherPlayersPassed(game);
    
    // Update game state for all players
    io.to(game.room).emit("game_state_update", {
      gameId,
      currentTurn: playerNames[game.players[game.currentPlayerIndex].id],
      lastPlayedCard: game.lastPlayedCard,
      players: game.players.map(player => ({
        username: playerNames[player.id],
        cardCount: player.hand.length
      }))
    });

    console.log("current player is " + playerNames[game.players[game.currentPlayerIndex].id])

    console.log("finished playing selectedCard");
  });

  socket.on("update_card_order", ({ gameId, cards }) => {
    if (!gameId || !gameSessions[gameId]) {
      return;
    }
    
    // Find the player in the game
    const game = gameSessions[gameId];
    const player = game.players.find(p => p.id === socket.id);
    
    if (player) {
      player.hand = cards;
    }
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
  });
});

// Function to handle player disconnection
function handlePlayerDisconnect(socket) {
  const room = playerRooms[socket.id];
  if (!room) return;

  // Remove player from tracking
  delete playerNames[socket.id];
  delete playerRooms[socket.id];

  // Check if room is empty
  const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
  if (roomSize <= 1) { // 1 because the disconnecting socket hasn't been removed yet
    // Clean up any game sessions for this room
    for (let gameId in gameSessions) {
      if (gameSessions[gameId].room === room) {
        delete gameSessions[gameId];
        break;
      }
    }
  }

  // Force all players to leave if game was in progress
  const affectedGame = Object.entries(gameSessions).find(([_, game]) => game.room === room);
  if (affectedGame) {
    io.to(room).emit("force_disconnect");
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        const playerSocket = io.sockets.sockets.get(socketId);
        if (playerSocket) {
          console.log(`Forcing ${socketId} to leave room ${room}`);
          playerSocket.leave(room);
        }
      });
    }
  }
}

// Periodic cleanup of stale rooms (every 30 seconds)
setInterval(() => {
  const rooms = io.sockets.adapter.rooms;
  rooms.forEach((sockets, room) => {
    // Skip Socket.IO internal rooms (they start with a slash)
    if (room.startsWith('/')) return;

    // Check if any sockets in the room are actually connected
    let hasActiveConnections = false;
    sockets.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        hasActiveConnections = true;
      }
    });

    // Clean up room if no active connections
    if (!hasActiveConnections) {
      console.log(`Cleaning up stale room: ${room}`);
      // Clean up any game sessions for this room
      for (let gameId in gameSessions) {
        if (gameSessions[gameId].room === room) {
          delete gameSessions[gameId];
          break;
        }
      }
      // Clean up any player associations
      for (let socketId in playerRooms) {
        if (playerRooms[socketId] === room) {
          delete playerRooms[socketId];
          delete playerNames[socketId];
        }
      }
    }
  });
}, 30000);

// Function to check if all other active players have passed
function checkAllOtherPlayersPassed(game) {
  // Get all active players (not finished)
  const activePlayers = game.players.filter(p => !p.finished);
  
  // If there's only one active player, no need to check
  if (activePlayers.length <= 1) return;
  
  // Get the player who just played (the one before the current player)
  const lastPlayedIndex = game.lastPlayedIndex;
  const playerWhoJustPlayed = game.players[lastPlayedIndex];
  
  // Check if all other active players have skipped
  const allOthersPassed = activePlayers
    .filter(p => p.id !== playerWhoJustPlayed.id) // Exclude the player who just played
    .every(p => p.skipped); // Check if all others have skipped
  
  if (allOthersPassed) {
    console.log("All other players passed. Clearing the table for a free turn.");
    
    // Clear the table
    game.lastPlayedCard = "";
    
    // Reset all skips
    activePlayers.forEach(p => (p.skipped = false));
    
    // Set the current player to the one who just played
    game.currentPlayerIndex = lastPlayedIndex;
    
    // Notify players that the round was won
    io.to(game.room).emit("round_won", {
      playerName: playerNames[playerWhoJustPlayed.id]
    });
  }
}

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
