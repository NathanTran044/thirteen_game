print("Hello world")
import random
CARDS_PER_PLAYER = 13

ALL_CARDS = list(range(52))

def begin():
    players = setup_players()

    # checks if the number of players is correct
    if players == -1:
        print("Number of players needs to be between 1 and 4")
        exit()

    deal_cards(players)
    print(player_cards)
    return player_cards

# gets the number of players and sets up each player's deck
def setup_players():
    global player_cards
    num_players = int(input("How many players are playing: "))

    if num_players < 1 or num_players > 4:
        return -1

    player_cards = [[] for _ in range(num_players)]

    return num_players

# deals each player shuffled, unique cards
def deal_cards(num_players):
    current_cards = ALL_CARDS.copy()  # Make a copy to avoid modifying the original list

    random.shuffle(current_cards)

    for i in range(num_players * CARDS_PER_PLAYER):
        current_player = i % num_players  # Determine the current player
        card = current_cards.pop()  # Remove and return a random card
        player_cards[current_player].append(card)