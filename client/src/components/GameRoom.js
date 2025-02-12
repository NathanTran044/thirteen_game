import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Chat from "./Chat";

function GameRoom({ socket }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { username, room, roomSize: initialSize } = location.state || {};
  const [roomSize, setRoomSize] = useState(initialSize);
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [currentTurn, setCurrentTurn] = useState("");
  const [lastPlayedCard, setLastPlayedCard] = useState("");

  const playCard = () => {
    console.log("GameId and Card played: " + gameId + " " + selectedCard);
    socket.emit("play_card", { gameId, selectedCard });
    setSelectedCard("")
  };

  const passTurn = () => {
    console.log("Passing");
    socket.emit("play_card", { gameId, selectedCard: "pass" });
  }

  const disconnect = () => {
    console.log("Disconnecting");
    socket.emit("leave_room");
    navigate("/house");
  }

  useEffect(() => {
    socket.on("room_info_update", ({ roomSize, gameId }) => {
      setRoomSize(roomSize);
      setGameId(gameId);
    });
    
    socket.on("game_state_update", (data) => {
      console.log("Game state updated:", data);
      setGameId(data.gameId);
      setCurrentTurn(data.currentTurn);
      setLastPlayedCard(data.lastPlayedCard);
    })

    socket.on("player_hand", (data) => {
      console.log("Player hand updated:", data);
      setPlayerCards(data);
    })

    socket.on("invalid_move", (data) => {
      alert(data.message);
    });

    socket.on("player_finished", (data) => {
      // setPlayerCards([]);
      // setGameStarted(false);
      alert(`Player ${data.finished} has finished`);
    });

  
    socket.on("game_over", (data) => {
      // setPlayerCards([]);
      // setGameStarted(false);
      alert(`Game over! Last Place: ${data.finished}`);
    });

    socket.on("force_disconnect", () => {
      socket.emit("leave_room");
      navigate("/house");
    })

    return () => {
      socket.off("room_info_update");
      socket.off("begin_game");
      socket.off("game_state_update");
      socket.off("player_hand");
      socket.off("invalid_move");
      socket.off("player_finished");
      socket.off("game_over");
      socket.off("force_disconnect");
    };
  }, [socket]);

  return (
    <div>
      <h2>Game Room: {room}</h2>
      <h3>Players in Room: {roomSize}</h3>
      <h3>{currentTurn}'s turn</h3>
      <h3>Last Played Card: {lastPlayedCard || "Play any card"}</h3>

      {playerCards.length > 0 && (
        <div>
          <p>Your Hand: {playerCards.join(" ")}</p>
        </div>
      )}

      <input
        type="text"
        placeholder="Enter card"
        value={selectedCard}
        onChange={(e) => setSelectedCard(e.target.value)}
      />
      <button onClick={playCard}>Play Card</button>
      <button onClick={passTurn}>Pass</button>

      <button onClick={disconnect}>Disconnect</button>

      <Chat socket={socket} room={room} username={username} />
    </div>
  );
}

export default GameRoom;
