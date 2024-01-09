import sys

from cards import begin

ALL_CARDS = ['3 S', '3 C', '3 D', '3 H', '4 S', '4 C', '4 D', '4 H', '5 S', 
             '5 C', '5 D', '5 H', '6 S', '6 C', '6 D', '6 H', '7 S', '7 C', 
             '7 D', '7 H', '8 S', '8 C', '8 D', '8 H', '9 S', '9 C', '9 D', 
             '9 H', '10 S', '10 C', '10 D', '10 H', 'J S', 'J C', 'J D', 
             'J H', 'Q S', 'Q C', 'Q D', 'Q H', 'K S', 'K C', 'K D', 
             'K H', 'A S', 'A C', 'A D', 'A H', '2 S', '2 C', '2 D', '2 H']

def play():
    global player_cards
    player_cards = begin()

    global current_player
    current_player = find_first_player(player_cards)

    print (current_player)

# loops though all players to find the player with the lowest card
def find_first_player(player_cards):
    min_value = sys.maxsize
    min_index = -1

    for index, player in enumerate(player_cards):
        cur_min = min(player, default=sys.maxsize)
        if cur_min < min_value:
            min_value = cur_min
            min_index = index

    return min_index
    


play()