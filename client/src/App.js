import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import Navbar from "./components/NavBar";
import io from "socket.io-client";

const socket = io.connect("http://localhost:3001");

function App() {
  return (
    <Router>
        <Navbar/>
          <Routes>
            <Route path="/" element={<Lobby socket={socket} />} />
            <Route path="/game" element={<GameRoom socket={socket} />} />
          </Routes>
    </Router>
  );
}

export default App;
