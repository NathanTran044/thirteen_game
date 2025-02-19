import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  if (location.pathname === "/game") return null; // Hide on /game

  return (
    <header className="App-header">
      <h1>Thirteen</h1>
      <nav>
        {/* <Link to="/">Home</Link> | <Link to="/lobby">Lobby</Link> */}
      </nav>
    </header>
  );
}

export default Navbar;
