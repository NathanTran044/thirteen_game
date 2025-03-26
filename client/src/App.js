import "./App.css";
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import Home from "./components/Home";
import NavBar from "./components/NavBar";
import io from "socket.io-client";

const SERVER_URL = "https://thirteen-game.onrender.com";
// const SERVER_URL = "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState(null);
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    // Wake-up function
    const wakeUpServer = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/wake-up`, { 
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          console.log("Server is awake");
          setServerReady(true);
        }
      } catch (error) {
        console.error("Failed to wake up server", error);
      }
    };

    // Initial server wake-up
    wakeUpServer();

    // Create socket connection
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/lobby" 
            element={socket ? <Lobby socket={socket} serverReady={serverReady} /> : null} 
          />
          <Route 
            path="/game" 
            element={socket ? <GameRoom socket={socket} /> : null} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;