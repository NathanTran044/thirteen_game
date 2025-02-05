import React, { useState, useEffect } from "react";

function GameLogic({ socket, room, roomSize, newGameId }) {
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState(newGameId);

  // Start Game: Calls Python backend
  const startGame = () => {
    if (roomSize >= 1 && roomSize <= 4) {
      socket.emit("start_game", { num_players: roomSize, room });
  
    } else {
      console.log("Wrong number of players");
    }
  };

  useEffect(() => {
    socket.on("game_state_update", (data) => {
      console.log("Game state updated:", data);
      setGameId(data.game_id);
      setPlayerCards(data.player_cards);
    });

    if (newGameId) {
      setGameId(newGameId);
    }

    return () => {
      socket.off("game_state_update"); // Cleanup
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

      {playerCards.length > 0 &&
        playerCards.map((hand, index) => (
          <div key={index}>
            <h4>Player {index + 1} Hand:</h4>
            <p>{hand.join(", ")}</p>
          </div>
        ))}
    </div>
  );
}

export default GameLogic;
