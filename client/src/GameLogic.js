import React, { useState, useEffect } from "react";

function GameLogic({ socket, room, roomSize, newGameId }) {
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState(newGameId);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState("");
  const [currentTurn, setCurrentTurn] = useState(false);

  // Start Game: Calls Python backend
  const startGame = () => {
    if (roomSize >= 1 && roomSize <= 4) {
      socket.emit("start_game", { num_players: roomSize, room });
  
    } else {
      console.log("Wrong number of players");
    }
  };

  const playCard = () => {
    console.log("GameId and Card played: " + gameId + " " + selectedCard);
    socket.emit("play_card", { gameId, selectedCard });
    setSelectedCard("")
  };

  useEffect(() => {
    socket.on("begin_game", () => {
      console.log("Game begin");
      setGameStarted(true);
    });

    socket.on("game_state_update", (data) => {
      console.log("Game state updated:", data);
      setGameId(data.gameId);
      setCurrentTurn(data.current_turn);
    });

    socket.on("player_hand", (data) => {
      console.log("Player hand updated:", data);
      setPlayerCards(data);
    })

    socket.on("invalid_move", (data) => {
      alert(data.message);
    });
  
    socket.on("game_over", (data) => {
      setPlayerCards([]);
      alert(`Game over! Winner: ${data.winner}`);
      setGameStarted(false);
    });

    if (newGameId) {
      setGameId(newGameId);
    }

    return () => {
      socket.off("begin_game");
      socket.off("game_state_update");
      socket.off("player_hand");
      socket.off("invalid_move");
      socket.off("game_over");
    };
  }, [newGameId]);

  return (
    <div>
      <h3>Game Logic</h3>
      
      <button onClick={startGame}>Start Game</button>

      {gameId && (
        <div>
          <h3>Game ID: {gameId}</h3>
        </div>
      )}

      {playerCards.length > 0 && (
        <div>
          <p>{playerCards.join(", ")}</p>
        </div>
      )}

      {gameStarted && (
        <div>
          <input
            type="text"
            placeholder="Enter card to play"
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
          />
          
          <button onClick={playCard}>Play Card</button>
        </div>
      )}
    </div>
  );
}

export default GameLogic;
