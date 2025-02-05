from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, rooms
import random
import uuid

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

CARDS_PER_PLAYER = 13
ALL_CARDS = [f"{c} {s}" for c in ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
             for s in ['S', 'C', 'D', 'H']]

game_sessions = {}

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = "http://localhost:3000"
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = "true"
    return response

def deal_cards(num_players):
    if num_players < 1 or num_players > 4:
        return None
    deck = ALL_CARDS.copy()
    random.shuffle(deck)
    return [deck[i * CARDS_PER_PLAYER:(i + 1) * CARDS_PER_PLAYER] for i in range(num_players)]

@app.route('/start_game', methods=['POST', 'OPTIONS'])
def start_game():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'CORS preflight OK'})
        return add_cors_headers(response)

    data = request.get_json()
    num_players = data.get('num_players')
    player_cards = deal_cards(num_players)

    if not player_cards:
        return jsonify({'error': 'Invalid number of players'}), 400

    game_id = str(uuid.uuid4())
    game_sessions[game_id] = player_cards

    # print("room is ", data.get('room'))
    # all_rooms = socketio.server.manager.rooms

    # # Ensure the room exists before accessing it
    # room_size = len(all_rooms.get('/', {}).get(data.get('room'), set()))
    # print("room size is ", room_size)

    room = data.get('room')
    room_size = len(socketio.server.manager.rooms.get("/", {}).get(room, set()))

    print(f"Room {room} size: {room_size}")

    socketio.emit('game_state_update', {
        'game_id': game_id,
        'player_cards': player_cards
    }, room=2) # only players in room get updated cards

    return jsonify({
        'game_id': game_id,
        'player_cards': player_cards
    })

@app.route('/game_state/<int:game_id>', methods=['GET', 'OPTIONS'])
def get_game_state(game_id):
    if request.method == "OPTIONS":
        response = jsonify({'message': 'CORS preflight OK'})
        return add_cors_headers(response)

    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404

    return jsonify({
        'game_id': game_id,
        'player_cards': game_sessions[game_id]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
