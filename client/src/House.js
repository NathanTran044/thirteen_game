import React, { useState, useEffect } from 'react';

function House({ socket }) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [roomSize, setRoomSize] = useState(0);

  // Join Room
  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room, (success, updatedSize) => {
        if (success) {
          console.log(`Successfully joined room: ${room}`);
          setRoomSize(updatedSize); // Update room size immediately
        } else {
          console.log(`Failed to join room: ${room}`);
        }
      });
    }
  };

  // Send Message
  const sendMessage = () => {
    if (message !== "") {
      const messageData = { room, username, message };
      socket.emit("send_message", messageData);
      setMessage(""); // Clear input
    }
  };

  // Handle Socket Events
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("room_size_update", (size) => {
      setRoomSize(size);
    });

    return () => {
      socket.off("receive_message");
      socket.off("room_size_update");
    };
  }, [socket]);

  return (
    <div>
      <h3>House Component</h3>
      
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
    </div>
  );
}

export default House;
