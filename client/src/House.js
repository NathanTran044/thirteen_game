import React from 'react';

function House({ socket, username, room }) {
  return (
    <div>
      <h3>House Component</h3>
      <span> Username: {username} </span>
      <span> Room: {room} </span>
    </div>
  );
}

export default House;
