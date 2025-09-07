# This is an example of how should be how calculations will be made

from pokerkit.hands import StandardHighHand
from pokerkit import Card

# --- Hole cards for 6 players ---
players = {
    "P1": [Card("As"), Card("Kd")],  # Ace-Spades, King-Diamonds
    "P2": [Card("7c"), Card("7h")],
    "P3": [Card("Qs"), Card("Jd")],
    "P4": [Card("9c"), Card("9d")],
    "P5": [Card("2s"), Card("3s")],
    "P6": [Card("Ah"), Card("Kh")],
}

# --- Board (community cards) ---
board = [Card("Ts"), Card("Qd"), Card("Jh"), Card("2c"), Card("9s")]

# --- Evaluate best hand for each player ---
results = {}
for name, hole_cards in players.items():
    all_cards = hole_cards + board
    best_hand = StandardHighHand.evaluate(all_cards)
    results[name] = best_hand

# --- Show results ---
for name, hand in results.items():
    print(f"{name}: {hand} ({hand.category})")

# --- Determine winner ---
winner = min(results.items(), key=lambda x: x[1].rank)
print("\nWinner:", winner[0], "with", winner[1])
