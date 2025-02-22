import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Chat from "./Chat";
import './GameRoom.css';

function GameRoom({ socket }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { username, room, roomSize: initialSize } = location.state || {};
  const [roomSize, setRoomSize] = useState(initialSize);
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [currentTurn, setCurrentTurn] = useState("");
  const [lastPlayedCard, setLastPlayedCard] = useState("");
  const [players, setPlayers] = useState([]);
  

  const getPlayerPositions = () => {
    switch (roomSize) {
      case 2:
        return ['bottom', 'top'];
      case 3:
        return ['bottom', 'left', 'right'];
      case 4:
        return ['bottom', 'left', 'top', 'right'];
      default:
        return ['bottom'];
    }
  };

  const PlayerAvatar = ({ name }) => (
    <div className="player-avatar">
      <div className="avatar-circle">{name[0]}</div>
      <div className="player-name">{name}</div>
    </div>
  );

  // Modified to handle multiple card selection
  const handleCardClick = (card) => {
    setSelectedCard(prev => {
      if (prev.includes(card)) {
        return prev.filter(c => c !== card);
      } else {
        return [...prev, card];
      }
    });
  };

  const getCardImage = (card) => {
    if (!card) return 'cardBack.png';
    
    // Convert card notation to image filename
    const rankMap = {
      '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', '2': '2'
    };

    const suitMap = {
      'C': 'Clubs',
      'D': 'Diamonds',
      'H': 'Hearts',
      'S': 'Spades'
    };

    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    
    return `card${suitMap[suit]}${rankMap[rank]}.png`;
  };

  const Card = ({ card, isSelectable = true, isSelected = false, faceDown = false }) => (
    <div 
      className={`playing-card ${isSelectable ? 'selectable' : ''} 
        ${isSelected ? 'selected' : ''}`}
      onClick={() => isSelectable && handleCardClick(card)}
    >
      <img 
        // src={`../images/cards/${faceDown ? 'cardBack.png' : getCardImage(card)}`} 
        src={`/images/cards/${faceDown ? 'cardBack.png' : getCardImage(card)}`} 
        alt={faceDown ? 'Card back' : card}
        className="card-image"
      />
    </div>
  );

  const PlayerPosition = ({ position, playerName, cardCount = 0 }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`player ${position}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`card-stack ${position === 'left' || position === 'right' ? 'horizontal' : ''} ${isHovered ? 'expanded' : ''}`}>
          {[...Array(cardCount)].map((_, i) => (
            <Card key={i} faceDown={true} isSelectable={false} />
          ))}
        </div>
        <PlayerAvatar name={playerName} />
      </div>
    );
  };

  const playCard = () => {
    const selectedCardString = selectedCard.join(' ');
    console.log("GameId and Card played: " + gameId + " " + selectedCardString);
    socket.emit("play_card", { gameId, selectedCard: selectedCardString });
    setSelectedCard("")
  };

  const passTurn = () => {
    console.log("Passing");
    socket.emit("play_card", { gameId, selectedCard: "pass" });
  }

  const disconnect = () => {
    console.log("Disconnecting");
    socket.emit("leave_room");
    navigate("/");
  }

  useEffect(() => {
    socket.on("room_info_update", ({ roomSize, gameId }) => {
      setRoomSize(roomSize);
      setGameId(gameId);
    });
    
    socket.on("game_state_update", (data) => {
      console.log("Game state updated:", data);
      setGameId(data.gameId);
      setCurrentTurn(data.currentTurn);
      setLastPlayedCard(data.lastPlayedCard);
    })

    socket.on("player_hand", (data) => {
      console.log("Player hand updated:", data);
      setPlayerCards(data);
    })

    socket.on("invalid_move", (data) => {
      alert(data.message);
    });

    socket.on("player_finished", (data) => {
      // setPlayerCards([]);
      // setGameStarted(false);
      alert(`Player ${data.finished} has finished`);
    });

  
    socket.on("game_over", (data) => {
      setPlayerCards([]);
      // setGameStarted(false);
      alert(`Game over! Last Place: ${data.finished}`);
    });

    socket.on("force_disconnect", () => {
      socket.emit("leave_room");
      navigate("/");
    })

    return () => {
      socket.off("room_info_update");
      socket.off("begin_game");
      socket.off("game_state_update");
      socket.off("player_hand");
      socket.off("invalid_move");
      socket.off("player_finished");
      socket.off("game_over");
      socket.off("force_disconnect");
    };
  }, [socket]);

  return (
    <div className="game-room">
      <div className="game-header">
        <h2>Game Room: {room}</h2>
        <button className="leave-button" onClick={disconnect}>Leave Game</button>
      </div>

      <div className="game-table">
        {getPlayerPositions().map((position, index) => {
          if (position === 'bottom') return null;
          return (
            <PlayerPosition
              key={position}
              position={position}
              playerName={`Player ${index + 1}`}
              cardCount={13}
            />
          )}
        )}

        <div className="center-area">
          <div className="pile">
          {lastPlayedCard && 
            lastPlayedCard.split(" ").map((card, index) => (
              <Card key={index} card={card} isSelectable={false} />
            ))
          }
          </div>
        </div>

        <div className="player-hand">
          <div className="cards">
            {playerCards.map((card, index) => (
              <Card
                key={index}
                card={card}
                isSelected={selectedCard.includes(card)}
              />
            ))}
          </div>
          <div className="controls">
            <button 
              className="play-button"
              onClick={playCard}
              disabled={selectedCard.length === 0}
            >
              Play
            </button>
            <button 
              className="pass-button"
              onClick={passTurn}
            >
              Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// <Chat socket={socket} room={room} username={username} />
export default GameRoom;
