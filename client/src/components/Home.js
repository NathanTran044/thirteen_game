import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  // Create an array of card suits for the pattern
  const cardSuits = ['♠', '♣', '♦', '♥'];
  const cardPatternRef = useRef(null);
  
  // Generate card pattern items in a checkered pattern (12x12 grid)
  const generateCardPattern = () => {
    const items = [];
    const rows = 12;
    const cols = 12;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Create a checkered pattern by alternating suits
        // For even rows, use one pattern; for odd rows, offset the pattern
        const suitIndex = (row % 2 === 0) 
          ? (col % 4) // Even rows: ♠, ♣, ♦, ♥, ♠, ♣, ...
          : ((col + 2) % 4); // Odd rows: ♦, ♥, ♠, ♣, ♦, ♥, ...
        
        items.push(
          <div key={`${row}-${col}`} className="card-pattern-item">
            {cardSuits[suitIndex]}
          </div>
        );
      }
    }
    return items;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!cardPatternRef.current) return;
      
      const patternItems = cardPatternRef.current.querySelectorAll('.parallax');
      const containerRect = cardPatternRef.current.getBoundingClientRect();
      
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      const offsetX = (mouseX - centerX) / 25;
      const offsetY = (mouseY - centerY) / 25;
      
      patternItems.forEach((item) => {
        const depth = parseFloat(item.getAttribute('data-depth'));
        const itemX = offsetX * depth;
        const itemY = offsetY * depth;
        
        item.style.transform = `translateX(${itemX}px) translateY(${itemY}px)`;
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const renderCardDivider = () => {
    return (
      <div className="card-divider">
        <div className="card-divider-item" data-suit="♠"></div>
        <div className="card-divider-item" data-suit="♣"></div>
        <div className="card-divider-item" data-suit="♦"></div>
        <div className="card-divider-item" data-suit="♥"></div>
        <div className="card-divider-item" data-suit="♠"></div>
      </div>
    );
  };

  return (
    <div className="home-container">
      <div className="card-pattern">
        {generateCardPattern()}
      </div>
      <div className="home-content">
        <div className="home-header">
          <h1>Welcome to Thirteen</h1>
          <p>Our version of the classic Vietnamese card game Tiến Lên (Thirteen)</p>
          {renderCardDivider()}
        </div>

        <div className="instructions">

          <div className="instructions-section">
            <h3>Game Overview</h3>
            <p>
              Thirteen is a multiplayer card game where players aim to be the first to get rid of all their cards.
              The game supports 2-4 players and uses a standard 52-card deck.
            </p>
          </div>

          <div className="instructions-section">
            <h3>Card Rankings</h3>
            <p>Cards are ranked from lowest to highest:</p>
            <ul>
              <li>3, 4, 5, 6, 7, 8, 9, 10, Jack, Queen, King, Ace, 2</li>
            </ul>
            <p>Suits are ranked:</p>
            <ul>
              <li><span className="suit">♠</span> Spades (lowest)</li>
              <li><span className="suit">♣</span> Clubs</li>
              <li><span className="suit" style={{color: "#e94057"}}>♦</span> Diamonds</li>
              <li><span className="suit" style={{color: "#e94057"}}>♥</span> Hearts (highest)</li>
            </ul>
          </div>

          <div className="instructions-section">
            <h3>Valid Plays</h3>
            <ul>
              <li>Single cards: Play any single card</li>
              <li>Pairs: Two cards of the same rank</li>
              <li>Triples: Three cards of the same rank</li>
              <li>Quads: Four cards of the same rank</li>
              <li>Straights: Three or more consecutive cards (Note: 2 cannot be part of a straight)</li>
              <li>Double Straights: Two or more consecutive pairs (e.g., 5-5-6-6-7-7)</li>
              <li>Special: A four of a kind or a double straight can be used to beat a single 2</li>
            </ul>
          </div>

          <div className="instructions-section">
            <h3>Game Rules</h3>
            <ul>
              <li>The player with the lowest card starts the first round, and the next rounds start with the previous winner</li>
              <li>Players must play a higher card or combination than the previous play (for combinations, the highest card determines if a combination is higher)</li>
              <li>Players can pass if they cannot or do not want to play</li>
              <li>When all players pass, the last player to play gets a free turn</li>
              <li>The winner is the first player to get rid of all their cards</li>
              <li>The game continues until only one player has cards left</li>
            </ul>
          </div>
        </div>

        <div className="card-suits">
            <span className="suit-icon">♠</span>
            <span className="suit-icon">♣</span>
            <span className="suit-icon">♦</span>
            <span className="suit-icon">♥</span>
          </div>

        <Link to="/lobby" className="play-button">
          Play Now
        </Link>
      </div>
    </div>
  );
}

export default Home;