import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBar.css";

function Navbar() {
  const location = useLocation();

  if (location.pathname === "/game") return null; // Hide on /game

  const isActive = (path) => location.pathname === path;

  return (
    <header className="App-header">
      <h1>Thirteen</h1>
      <nav>
        <Link to="/" className={isActive("/") ? "active" : ""}>
          Lobby
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;