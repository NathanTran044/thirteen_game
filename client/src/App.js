import './App.css';
import React, { useState, useEffect } from 'react';
import io from "socket.io-client";
import House from "./House";

const socket = io.connect("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room, (success) => {
        if (success) {
          console.log(`Successfully joined room: ${room}`);
        } else {
          console.log(`Failed to join room: ${room}`);
        }
      });
    }
  };

  const sendMessage = () => {
    if (message !== "") {
      const messageData = { room, username, message };
      socket.emit("send_message", messageData);
      // setMessages((prev) => [...prev, messageData]);
      setMessage(""); // Clear input
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
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
        <button onClick={joinRoom}>Join A Room</button>

        <House socket={socket} username={username} room={room} />

        <div>
          <input
            type="text"
            placeholder="Message..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>

        <div>
          {messages.map((msg, index) => (
            <p key={index}><strong>{msg.username}:</strong> {msg.message}</p>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
