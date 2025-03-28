import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import "./Lobby.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function Lobby({ socket, serverReady }) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [roomSize, setRoomSize] = useState(0);
  const [gameId, setGameId] = useState("");
  const navigate = useNavigate();

  // Join Room
  const joinRoom = () => {
    // Check server readiness first
    if (!serverReady) {
      toast.warn("Server is still warming up. Please wait a moment.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
      return;
    }

    if (username !== "" && room !== "") {
      socket.emit("join_room", { username, room }, (success, updatedSize, id) => {
        if (success) {
          console.log(`${id} Successfully joined room: ${room}`);
          setGameId(id);
        } else {
          toast.error(`Failed to join room: ${room}`, {
            position: "top-right",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            draggable: true,
            pauseOnHover: false,
            theme: "light",
          });
        }
      });
    }
  };

  // Start Game
  const startGame = () => {
    if (roomSize > 1 && roomSize <= 4) {
      socket.emit("start_game", { num_players: roomSize, room });
    } else {
      toast.error("Invalid number of players.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    }
  };

  // Handle Socket Events
  useEffect(() => {
    socket.on("room_info_update", ({ roomSize, gameId }) => {
      setRoomSize(roomSize);
      setGameId(gameId);
    });

    socket.on("invalid_move", (data) => {
      toast.error(data.message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    });

    socket.on("begin_game", () => {
      console.log("Game begin");
      console.log("sending this data: ",  { username, room, roomSize, gameId });
      navigate("/game", { state: { username, room, roomSize, gameId } });
    });

    return () => {
      socket.off("room_info_update");
      socket.off("invalid_move");
      socket.off("begin_game");
    };
  }, [socket, username, room, roomSize, gameId, navigate]);

  return (
    <div className="lobby-container">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div className="lobby-box">
        <div className="content-wrapper">
          <h1>Join Room</h1>
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Username"
              onChange={(event) => setUsername(event.target.value)}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Room ID"
              onChange={(event) => setRoom(event.target.value)}
            />
          </div>
          <button className="join-button" onClick={joinRoom}>
            JOIN
          </button>
          {roomSize > 0 && (
            <div className="game-status">
              <div className="player-count">
                Players in Room: {roomSize}/4
              </div>
              <button className="start-button" onClick={startGame}>
                START GAME
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
