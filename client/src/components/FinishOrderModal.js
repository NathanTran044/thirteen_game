import React from 'react';
import './FinishOrderModal.css';

function FinishOrderModal({ finishOrder, onClose }) {
  if (!finishOrder) return null;

  return (
    <div className="finish-order-overlay">
      <div className="finish-order-modal">
        <h2>Game Results</h2>
        <ul className="finish-order-list">
          {finishOrder.map((playerName, index) => (
            <li key={index} className="finish-order-item">
              <span className="position">{index + 1}</span>
              <span className="name">{playerName}</span>
            </li>
          ))}
        </ul>
        <button className="close-modal-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default FinishOrderModal; 