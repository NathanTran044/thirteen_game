import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import House from "./House";
import io from "socket.io-client";

const socket = io.connect("http://localhost:3001");

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Card Game</h1>
          <nav>
            <Link to="/house">House</Link> | 
            {/* <Link to="/leaderboard">Leaderboard</Link> | 
            <Link to="/">Home</Link> */}
          </nav>
        </header>

        <Routes>
          <Route path="/house" element={<House socket={socket} />} />
          {/* <Route path="/leaderboard" element={<h3>Leaderboard Page</h3>} />
          <Route path="/" element={<h3>Home Page</h3>} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;