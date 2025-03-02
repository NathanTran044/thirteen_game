import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Chat from "./Chat";
import FinishOrderModal from "./FinishOrderModal";
import './GameRoom.css';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function GameRoom({ socket }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { username, room, roomSize: initialSize } = location.state || {};
  const [roomSize, setRoomSize] = useState(initialSize);
  const [playerCards, setPlayerCards] = useState([]);
  const [gameId, setGameId] = useState("");
  const [selectedCard, setSelectedCard] = useState([]);
  const [currentTurn, setCurrentTurn] = useState("");
  const [lastPlayedCard, setLastPlayedCard] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [finishOrder, setFinishOrder] = useState(null);

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
        src={`/images/cards/${faceDown ? 'cardBack.png' : getCardImage(card)}`} 
        alt={faceDown ? 'Card back' : card}
        className="card-image"
      />
    </div>
  );

  const DraggableCard = ({ index, card, isSelected, moveCard }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'card',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'card',
    hover(item) {
      if (item.index !== index) {
        moveCard(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        playing-card 
        selectable 
        ${isSelected ? 'selected' : ''} 
        ${isDragging ? 'is-dragging' : ''} 
        ${isOver ? 'is-over' : ''}
      `}
      onClick={() => handleCardClick(card)}
    >
      <img 
        src={`/images/cards/${getCardImage(card)}`}
        alt={card}
        className="card-image"
      />
    </div>
  );
};

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

  const moveCard = (dragIndex, hoverIndex) => {
    const newCards = [...playerCards];
    const draggedCard = newCards[dragIndex];
    newCards.splice(dragIndex, 1);
    newCards.splice(hoverIndex, 0, draggedCard);
    setPlayerCards(newCards);
    
    // Send the updated card order to the server
    if (gameId) {
      socket.emit("update_card_order", { gameId, cards: newCards });
    }
  };

  const playCard = () => {
    const selectedCardString = selectedCard.join(' ');
    console.log("GameId and Card played: " + gameId + " " + selectedCardString);
    socket.emit("play_card", { gameId, selectedCard: selectedCardString });
    setSelectedCard([]);
  };

  const passTurn = () => {
    console.log("Passing");
    socket.emit("play_card", { gameId, selectedCard: "pass" });
  };

  const disconnect = () => {
    console.log("Disconnecting");
    socket.emit("leave_room");
    navigate("/lobby");
  };

  const openChat = () => {
    setIsChatOpen(true);
    setHasNewMessage(false); // Clear notification when opening chat
  };

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
      setPlayers(data.players);
    });

    socket.on("player_hand", (data) => {
      console.log("Player hand updated:", data);
      setPlayerCards(data);
    });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
      if (!isChatOpen) {
        setHasNewMessage(true); // Show notification if chat is closed
      }
    });

    socket.on("invalid_move", (data) => {
      toast.error(data.message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    });

    socket.on("player_passed", (data) => {
      toast.info(`${data.playerName} passed`, {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    });

    socket.on("player_finished", (data) => {
      // setPlayerCards([]);
      // setGameStarted(false);
      toast.info(`${data.finished} has finished`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    });

  
    socket.on("game_over", (data) => {
      setPlayerCards([]);
      setFinishOrder(data.finishOrder);
      toast.info(`Game over! Last Place: ${data.finished}`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: false,
        theme: "light",
      });
    });

    socket.on("force_disconnect", () => {
      socket.emit("leave_room");
      navigate("/lobby");
    });

    return () => {
      socket.off("room_info_update");
      socket.off("begin_game");
      socket.off("game_state_update");
      socket.off("player_hand");
      socket.off("receive_message");
      socket.off("invalid_move");
      socket.off("player_finished");
      socket.off("game_over");
      socket.off("force_disconnect");
      socket.off("player_passed");
    };
  }, [socket, isChatOpen, navigate]);

  return ( 
    <div>
      <div className="game-room">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        <div className="game-header">
          <h2>{currentTurn}'s Turn</h2>
          <div className="header-buttons">
            <button className="chat-icon" onClick={openChat}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18" fill="currentColor">
                <path d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 2.7 466 2.2 466.5c-2.2 2.3-2.8 5.7-1.5 8.7 1.3 3 4.1 4.8 7.3 4.8 66.3 0 116-31.8 140.6-51.4 32.7 12.3 69 19.4 107.4 19.4 141.4 0 256-93.1 256-208S397.4 32 256 32z"/>
              </svg>
              {hasNewMessage && <span className="chat-notification"></span>}
            </button>
            <button className="leave-button" onClick={disconnect}>Leave Game</button>
          </div>
        </div>

        <div className="game-container">
          <div className="game-table">
            {players && players
              .filter(player => player.username !== username)
              .map((player, index) => {
                const position = getPlayerPositions()[index + 1];
                return (
                  <PlayerPosition
                    key={player.username}
                    position={position}
                    playerName={player.username}
                    cardCount={player.cardCount}
                  />
                );
              })}

            <div className="center-area">
              <div className="pile">
                {lastPlayedCard && 
                  lastPlayedCard.split(" ").map((card, index) => (
                    <Card key={index} card={card} isSelectable={false} />
                  ))
                }
              </div>
            </div>

            <DndProvider backend={HTML5Backend}>
              <div className="player-hand">
                <div className="cards">
                  {playerCards.map((card, index) => (
                    <DraggableCard
                      key={index}
                      index={index}
                      card={card}
                      isSelected={selectedCard.includes(card)}
                      moveCard={moveCard}
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
            </DndProvider>
          </div>
        </div>
      </div>

      <Chat 
        socket={socket} 
        room={room} 
        username={username} 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        setMessages={setMessages}
      />

      <FinishOrderModal 
        finishOrder={finishOrder}
        onClose={() => setFinishOrder(null)}
      />
    </div>
  );
}
// <Chat socket={socket} room={room} username={username} />
export default GameRoom;
