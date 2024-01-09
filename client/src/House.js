import React from 'react'

function House({ socket, username, room }) {
    return (
        <div>
            <button >House Here</button>
            {/* <span> {socket}</span> */}
            <span> {username}</span>
            <span> {room}</span>
        </div>
    )
}

export default House