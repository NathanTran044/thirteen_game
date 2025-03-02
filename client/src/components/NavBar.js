import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBar.css";

function Navbar() {
  const location = useLocation();

  if (location.pathname === "/game") return null; // Hide on /game

  const isActive = (path) => location.pathname === path;

  return (
    <header className="App-header">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1>Thirteen</h1>
      </Link>
      <nav>
        <Link to="/" className={isActive("/") ? "active" : ""}>
          Home
        </Link>
        <Link to="/lobby" className={isActive("/lobby") ? "active" : ""}>
          Lobby
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;