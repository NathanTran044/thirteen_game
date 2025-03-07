import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import Home from "./components/Home";
import NavBar from "./components/NavBar";
import io from "socket.io-client";

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);
// const socket = io.connect("http://localhost:3001");

function App() {
  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby socket={socket} />} />
          <Route path="/game" element={<GameRoom socket={socket} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
