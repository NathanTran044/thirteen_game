import "./App.css";
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";
import io from "socket.io-client";

const socket = io.connect("http://localhost:3001");

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<h3>Welcome to the Card Game!</h3>} />
          <Route path="/lobby" element={<Lobby socket={socket} />} />
          <Route path="/game" element={<GameRoom socket={socket} />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

// Layout component to conditionally hide the navbar
function MainLayout({ children }) {
  const location = useLocation();

  return (
    <div className="App">
      {/* Show the navbar only if NOT on /game */}
      {location.pathname !== "/game" && (
        <header className="App-header">
          <h1>Card Game</h1>
          <nav>
            <Link to="/">Home</Link> | <Link to="/lobby">Lobby</Link>
          </nav>
        </header>
      )}
      {children}
    </div>
  );
}

export default App;
