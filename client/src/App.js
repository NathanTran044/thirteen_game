import './App.css';
import React, { useState } from 'react';
import io from "socket.io-client";
import House from "./House";

const socket = io.connect("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");

  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room, (success) => {
        if (success) {
          console.log(`Successfully joined room ${room}`);
        } else {
          console.log(`Failed to join room ${room}`);
        }
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <input
          type="text"
          placeholder="Username"
          onChange={(event) => {
            setUsername(event.target.value);
          }}
        />
        <input
          type="text"
          placeholder="Room ID"
          onChange={(event) => {
            setRoom(event.target.value);
          }}
        />
        <button onClick={joinRoom}>Join A Room</button>

        <House socket={socket} username={username} room={room}/>
      </header>
    </div>
  );
}

export default App;
