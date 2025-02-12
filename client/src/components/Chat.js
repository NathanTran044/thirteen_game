import React, { useState, useEffect } from "react";

function Chat({ socket, room, username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [socket]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { room, username, message });
      setMessage("");
    }
  };

  return (
    <div>
      <h3>Chat</h3>
      <input type="text" placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
      <div>
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.username}:</strong> {msg.message}</p>
        ))}
      </div>
    </div>
  );
}

export default Chat;