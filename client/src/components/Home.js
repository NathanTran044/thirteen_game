import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  // Create an array of card suits for the pattern
  const cardSuits = ['♠', '♣', '♦', '♥'];
  const cardPatternRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');
  const instructionsRef = useRef(null);
  
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
        
        const depth = Math.random() * 0.5 + 0.5; // Random depth between 0.5 and 1
        
        items.push(
          <div 
            key={`${row}-${col}`} 
            className="card-pattern-item parallax" 
            data-depth={depth}
          >
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
    
    // Add scroll animation for elements
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    }, { threshold: 0.1 });
    
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const renderCardDivider = () => {
    return (
      <div className="card-divider animate-on-scroll">
        <div className="card-divider-item" data-suit="♠"></div>
        <div className="card-divider-item" data-suit="♣"></div>
        <div className="card-divider-item" data-suit="♦"></div>
        <div className="card-divider-item" data-suit="♥"></div>
      </div>
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Example card combinations to display
  const exampleHands = [
    { name: "Lowest Card", cards: ["3♠"], description: "The lowest single card in the game. The player with this card starts the first game." },
    { name: "Highest Card", cards: ["2♥"], description: "The highest single card in the game." },
    { name: "Instant Win", cards: ["2♠", "2♣", "2♦", "2♥"], description: "Playing all 2s gives you an instant win." }
  ];

  const renderCardCombination = (combination, index) => {
    return (
      <div key={index} className="card-combination animate-on-scroll">
        <h4>{combination.name}</h4>
        <div className="card-hand">
          {combination.cards.map((card, i) => {
            const value = card.slice(0, -1);
            const suit = card.slice(-1);
            const isRed = suit === '♥' || suit === '♦';
            
            return (
              <div key={i} className="example-card">
                <span className="card-value" style={{ color: isRed ? '#e94057' : 'black' }}>{value}</span>
                <span className="card-suit" style={{ color: isRed ? '#e94057' : 'black' }}>{suit}</span>
              </div>
            );
          })}
        </div>
        <p className="combination-description">{combination.description}</p>
      </div>
    );
  };

  // Function to scroll to instructions section
  const scrollToInstructions = () => {
    instructionsRef.current.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="home-container">
      <div className="card-pattern" ref={cardPatternRef}>
        {generateCardPattern()}
      </div>
      
      <div className="home-hero">
        <div className="hero-content animate-on-scroll">
          <h1>Welcome to Thirteen</h1>
          <p>Our version of the classic Vietnamese card game Tiến Lên (Thirteen)</p>
          <div className="hero-buttons">
            <Link to="/lobby" className="home-play-button large">
              Play Now
            </Link>
            <button onClick={scrollToInstructions} className="learn-button">
              Learn How to Play
            </button>
          </div>
        </div>
      </div>
      
      <div className="home-content" ref={instructionsRef}>
        {renderCardDivider()}
        
        <div className="tab-navigation animate-on-scroll">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} 
            onClick={() => handleTabChange('overview')}
          >
            Game Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`} 
            onClick={() => handleTabChange('rules')}
          >
            Rules
          </button>
          <button 
            className={`tab-button ${activeTab === 'cards' ? 'active' : ''}`} 
            onClick={() => handleTabChange('cards')}
          >
            Card Rankings
          </button>
          <button 
            className={`tab-button ${activeTab === 'plays' ? 'active' : ''}`} 
            onClick={() => handleTabChange('plays')}
          >
            Valid Plays
          </button>
        </div>

        <div className="instructions">
          <div className={`instructions-section animate-on-scroll ${activeTab === 'overview' ? 'active' : ''}`}>
            <h3>Game Overview</h3>
            <p>
              Thirteen is a multiplayer card game where players aim to be the first to get rid of all their cards.
              The game supports 2-4 players and uses a standard 52-card deck.
            </p>
            <div className="info-card">
              <div className="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="30" height="30" fill="currentColor">
                  <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zM256 128c17.67 0 32 14.33 32 32c0 17.67-14.33 32-32 32S224 177.7 224 160C224 142.3 238.3 128 256 128zM296 384h-80C202.8 384 192 373.3 192 360s10.75-24 24-24h16v-64H224c-13.25 0-24-10.75-24-24S210.8 224 224 224h32c13.25 0 24 10.75 24 24v88h16c13.25 0 24 10.75 24 24S309.3 384 296 384z"/>
                </svg>
              </div>
              <div className="info-content">
                <h4>Quick Facts</h4>
                <ul>
                  <li>Players: 2-4</li>
                  <li>Deck: Standard 52 cards</li>
                  <li>Game Time: 5-15 minutes</li>
                </ul>
              </div>
            </div>
            
            <div className="card-display-section">
              <h4>Imortant Card Combinations</h4>
              <div className="combination-examples-container">
                {exampleHands.map(renderCardCombination)}
              </div>
            </div>
          </div>

          <div className={`instructions-section animate-on-scroll ${activeTab === 'cards' ? 'active' : ''}`}>
            <h3>Card Rankings</h3>
            <div className="card-ranking-container">
              <div className="card-ranking-section">
                <h4>Card Values (Low to High)</h4>
                <div className="card-value-ranking">
                  <div className="card-rank">3</div>
                  <div className="card-rank">4</div>
                  <div className="card-rank">5</div>
                  <div className="card-rank">6</div>
                  <div className="card-rank">7</div>
                  <div className="card-rank">8</div>
                  <div className="card-rank">9</div>
                  <div className="card-rank">10</div>
                  <div className="card-rank">J</div>
                  <div className="card-rank">Q</div>
                  <div className="card-rank">K</div>
                  <div className="card-rank">A</div>
                  <div className="card-rank">2</div>
                </div>
              </div>
              
              <div className="card-ranking-section">
                <h4>Suit Rankings (Low to High)</h4>
                <div className="suit-ranking">
                  <div className="suit-rank">
                    <span className="suit">♠</span> Spades (lowest)
                  </div>
                  <div className="suit-rank">
                    <span className="suit">♣</span> Clubs
                  </div>
                  <div className="suit-rank">
                    <span className="suit red">♦</span> Diamonds
                  </div>
                  <div className="suit-rank">
                    <span className="suit red">♥</span> Hearts (highest)
                  </div>
                </div>
              </div>
            </div>
            
            <div className="tip-box">
              <h4>Tip: Card Comparison</h4>
              <p>For card combinations, the highest-ranking card determines the combination's overall strength. For example, the straight 5-6-7-8-9 with a 9♣ beats 5-6-7-8-9 with a 9♠.</p>
            </div>
          </div>

          <div className={`instructions-section animate-on-scroll ${activeTab === 'plays' ? 'active' : ''}`}>
            <h3>Valid Plays</h3>
            <div className="plays-grid">
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card black">
                    <span className="rank">A</span>
                    <span className="suit">♠</span>
                  </div>
                </div>
                <h4>Single Cards</h4>
                <p>Play any single card. Must be higher than the previous single card played.</p>
              </div>
              
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card black">
                    <span className="rank">J</span>
                    <span className="suit">♣</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">J</span>
                    <span className="suit">♠</span>
                  </div>
                </div>
                <h4>Pairs</h4>
                <p>Two cards of the same rank.</p>
              </div>
              
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card red">
                    <span className="rank">Q</span>
                    <span className="suit">♥</span>
                  </div>
                  <div className="mini-card red">
                    <span className="rank">Q</span>
                    <span className="suit">♦</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">Q</span>
                    <span className="suit">♠</span>
                  </div>
                </div>
                <h4>Triples</h4>
                <p>Three cards of the same rank.</p>
              </div>
              
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card red">
                    <span className="rank">K</span>
                    <span className="suit">♥</span>
                  </div>
                  <div className="mini-card red">
                    <span className="rank">K</span>
                    <span className="suit">♦</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">K</span>
                    <span className="suit">♣</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">K</span>
                    <span className="suit">♠</span>
                  </div>
                </div>
                <h4>Four of a Kind</h4>
                <p>Four cards of the same rank.</p>
              </div>
              
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card red">
                    <span className="rank">4</span>
                    <span className="suit">♥</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">5</span>
                    <span className="suit">♠</span>
                  </div>
                  <div className="mini-card red">
                    <span className="rank">6</span>
                    <span className="suit">♦</span>
                  </div>
                </div>
                <h4>Straights</h4>
                <p>Three or more consecutive cards. A 2 cannot be part of this straight.</p>
              </div>
              
              <div className="play-card">
                <div className="play-icon">
                  <div className="mini-card red">
                    <span className="rank">9</span>
                    <span className="suit">♥</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">9</span>
                    <span className="suit">♠</span>
                  </div>
                  <div className="mini-card red">
                    <span className="rank">10</span>
                    <span className="suit">♦</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">10</span>
                    <span className="suit">♣</span>
                  </div>
                  <div className="mini-card red">
                    <span className="rank">J</span>
                    <span className="suit">♥</span>
                  </div>
                  <div className="mini-card black">
                    <span className="rank">J</span>
                    <span className="suit">♣</span>
                  </div>

                </div>
                <h4>Double Straights</h4>
                <p>Two or more consecutive pairs. A 2 cannot be part of this straight.</p>
              </div>
              
              <div className="play-card special-rule">
                <div className="corner-ribbon">
                  <span>SPECIAL</span>
                </div>

                <div className="special-rule-right">
                  <h4>Special Rule: Beating a 2</h4>
                  <div className="special-rule-content">
                    <p>The powerful 2 card can normally only be beaten by another 2 of higher suit. However, there are two special combinations that can defeat a single 2:</p>
                    
                    <div className="special-rule-example">
                      <div className="cards-container">
                        <span className="card played">
                          8
                        </span>
                        <span className="card played">
                          8
                        </span>
                        <span className="card played">
                          8
                        </span>
                        <span className="card played">
                          8
                        </span>
                      </div>
                      <span className="beats">➜</span>
                      <div className="cards-container">
                        <span className="card single-two red">
                          2
                        </span>
                      </div>
                      <span style={{ marginLeft: "10px", fontSize: "0.95rem", color: "#555", fontStyle: "italic" }}>Four of a kind beats a single 2</span>
                    </div>
                    
                    <div className="special-rule-example">
                      <div className="cards-container">
                        <span className="card played red">
                          5
                        </span>
                        <span className="card played">
                          5
                        </span>
                        <span className="card played red">
                          6
                        </span>
                        <span className="card played">
                          6
                        </span>
                        <span className="card played red">
                          7
                        </span>
                        <span className="card played">
                          7
                        </span>
                      </div>
                      <span className="beats">➜</span>
                      <div className="cards-container">
                        <span className="card single-two red">
                          2
                        </span>
                      </div>
                      <span style={{ marginLeft: "10px", fontSize: "0.95rem", color: "#555", fontStyle: "italic" }}>Double straight beats a single 2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`instructions-section animate-on-scroll ${activeTab === 'rules' ? 'active' : ''}`}>
            <h3>Game Rules</h3>
            <div className="rules-container">
              <div className="rule-item">
                <div className="rule-number">1</div>
                <div className="rule-content">
                  <h4>Starting the Game</h4>
                  <p>The player with the lowest card starts the first round, and subsequent rounds start with the previous winner.</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-number">2</div>
                <div className="rule-content">
                  <h4>Playing Cards</h4>
                  <p>Players must play a higher card or combination than the previous play. For combinations, the highest card determines which is higher.</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-number">3</div>
                <div className="rule-content">
                  <h4>Passing</h4>
                  <p>Players can pass if they cannot or do not want to play. When all players pass, the last player to play gets a free turn.</p>
                </div>
              </div>
              
              <div className="rule-item">
                <div className="rule-number">4</div>
                <div className="rule-content">
                  <h4>Winning</h4>
                  <p>The winner is the first player to get rid of all their cards. The game continues until only one player has cards left.</p>
                </div>
              </div>
            </div>
            
            <div className="tip-box">
              <h4>Strategy Tip</h4>
              <p>Try to save your 2s and other high cards for the end of the game when they're more difficult to beat.</p>
            </div>
          </div>
        </div>

        <div className="action-section animate-on-scroll">
          <h3>Ready to Play?</h3>
          <Link to="/lobby" className="hero-play-button">
            Join a Game
          </Link>
        </div>

        <div className="card-suits">
          <span className="suit-icon">♠</span>
          <span className="suit-icon">♣</span>
          <span className="suit-icon">♦</span>
          <span className="suit-icon">♥</span>
        </div>
      </div>
      
      <div className="home-footer">
      <span>Made by </span>
      <a href="https://github.com/NathanTran044/thirteen_game" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}>
        Nathan Tran
      </a>
      </div>
    </div>
  );
}

export default Home;