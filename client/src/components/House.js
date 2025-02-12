import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

function House({ socket }) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [roomSize, setRoomSize] = useState(0);
  const [gameId, setGameId] = useState("");
  const navigate = useNavigate();

  // Join Room
  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", { username, room }, (success, updatedSize, id) => {
        if (success) {
          console.log(`${id} Successfully joined room: ${room}`);
          setRoomSize(updatedSize); 
          setGameId(id);
        } else {
          alert(`Failed to join room: ${room}`);
        }
      });
    }
  };

  // Start Game
  const startGame = () => {
    if (roomSize > 1 && roomSize <= 4) {
      socket.emit("start_game", { num_players: roomSize, room });
    } else {
      alert("Invalid number of players.");
    }
  };

  // Handle Socket Events
  useEffect(() => {
    socket.on("room_info_update", ({ roomSize, gameId }) => {
      setRoomSize(roomSize);
      setGameId(gameId);
    });

    socket.on("invalid_move", (data) => {
      alert(data.message);
    });

    socket.on("begin_game", () => {
      console.log("Game begin");
      console.log("sending this data: ",  { username, room, roomSize, gameId })
      navigate("/game", { state: { username, room, roomSize, gameId } });
    });

    return () => {
      socket.off("room_info_update");
      socket.off("invalid_move");
      socket.off("begin_game");
    };
  }, [socket, username, room, roomSize, gameId, navigate]);

  return (
    <div>
      <h3>Join a Game Room</h3>
      
      <input
        type="text"
        placeholder="Username"
        onChange={(event) => setUsername(event.target.value)}
      />
      <input
        type="text"
        placeholder="Room ID"
        onChange={(event) => setRoom(event.target.value)}
      />
      <button onClick={joinRoom}>Join Room</button>

      <h3>Users in Room: {roomSize}</h3>

      {roomSize > 0 && <button onClick={startGame}>Start Game</button>}
    </div>
  );
}

export default House;
