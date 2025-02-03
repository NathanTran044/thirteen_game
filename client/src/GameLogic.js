import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5001");

function GameLogic({ roomSize }) {
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState(null);

  // Start Game: Calls Python backend
  const startGame = async () => {
    if (roomSize >= 1 && roomSize <= 4) {
      try {
        const response = await fetch("http://localhost:5001/start_game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ num_players: roomSize }),
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to start game");

        const data = await response.json();
        setGameId(data.game_id);
        setPlayerCards(data.player_cards);
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
      console.log("Wrong number of players");
    }
  };

  // Listen for real-time game state updates
  useEffect(() => {
    socket.on("game_state_update", (data) => {
      console.log("Game state updated:", data);
      setGameId(data.game_id);
      setPlayerCards(data.player_cards);
    });

    return () => {
      socket.off("game_state_update"); // Cleanup
    };
  }, []);

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
