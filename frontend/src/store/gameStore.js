resetGame: () => set((state) => {
    // Generate random hole cards for all players
    const deck = generateDeck();
    shuffle(deck);// frontend/src/store/gameStore.js - Fixed game state with progressive cards

import { create } from 'zustand';

const STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];

export const useGameStore = create((set, get) => ({
  // Game state
  gameState: 'setup', // setup, playing, finished
  currentStreet: 'preflop',
  currentPlayer: 0,
  pot: 0,
  smallBlind: 20,
  bigBlind: 40,
  deck: [], // Store the deck for consistent card dealing
  
  // Players state
  players: Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    stackSize: 1000,
    currentBet: 0,
    totalBet: 0,
    holeCards: [],
    folded: false,
    allIn: false,
    actions: []
  })),
  
  // Board state
  boardCards: [],
  
  // Actions
  resetGame: () => set((state) => {
    // Generate random hole cards for all players
    const deck = generateDeck();
    shuffle(deck);
    
    const newPlayers = state.players.map((player, index) => ({
      ...player,
      holeCards: [deck[index * 2], deck[index * 2 + 1]],
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      actions: []
    }));
    
    // Post blinds
    newPlayers[1].currentBet = state.smallBlind; // SB
    newPlayers[1].totalBet = state.smallBlind;
    newPlayers[1].stackSize -= state.smallBlind;
    newPlayers[2].currentBet = state.bigBlind; // BB
    newPlayers[2].totalBet = state.bigBlind;
    newPlayers[2].stackSize -= state.bigBlind;
    
    return {
      gameState: 'playing',
      currentStreet: 'preflop',
      currentPlayer: 3, // UTG (position after BB)
      pot: state.smallBlind + state.bigBlind,
      players: newPlayers,
      boardCards: [], // Start with no board cards shown
      deck: deck // Store deck for later use
    };
  }),
  
  setStackSizes: (stacks) => set((state) => ({
    players: state.players.map((player, index) => ({
      ...player,
      stackSize: stacks[index] || player.stackSize
    }))
  })),
  
  playerAction: (playerId, action, amount = 0) => set((state) => {
    if (state.gameState !== 'playing') return state;
    
    const playerIndex = playerId - 1;
    const newPlayers = [...state.players];
    const player = newPlayers[playerIndex];
    
    // Prevent actions if player already folded or is all-in
    if (player.folded || player.allIn) return state;
    
    let actionAmount = amount;
    const currentBet = getCurrentBet(state);
    
    // Handle different actions
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'check':
        // Can only check if no bet to call
        if (currentBet > player.currentBet) return state;
        break;
        
      case 'call':
        const callAmount = currentBet - player.currentBet;
        actionAmount = Math.min(callAmount, player.stackSize);
        player.currentBet += actionAmount;
        player.totalBet += actionAmount;
        player.stackSize -= actionAmount;
        if (player.stackSize === 0) player.allIn = true;
        break;
        
      case 'bet':
      case 'raise':
        if (amount <= currentBet) return state; // Invalid bet/raise
        actionAmount = amount - player.currentBet;
        if (actionAmount > player.stackSize) actionAmount = player.stackSize;
        player.currentBet += actionAmount;
        player.totalBet += actionAmount;
        player.stackSize -= actionAmount;
        if (player.stackSize === 0) player.allIn = true;
        break;
        
      case 'all_in':
        actionAmount = player.stackSize;
        player.currentBet += actionAmount;
        player.totalBet += actionAmount;
        player.stackSize = 0;
        player.allIn = true;
        break;
        
      default:
        return state;
    }
    
    // Record action in log
    const actionText = `Player ${player.id}: ${action}${actionAmount > 0 ? ` ${actionAmount}` : ''}`;
    const newActionLog = [...state.actionLog, actionText];
    
    // Record action
    player.actions.push({
      action,
      amount: actionAmount,
      street: state.currentStreet
    });
    
    // Update pot
    const newPot = state.pot + actionAmount;
    
    // Check if hand should advance to next street or end
    const { nextPlayer, shouldAdvanceStreet, handFinished } = getNextGameState(state, newPlayers);
    
    let newStreet = state.currentStreet;
    let newGameState = state.gameState;
    let newBoardCards = [...state.boardCards];
    let newWinners = [];
    let newHandHistory = [...state.handHistory];
    
    if (handFinished) {
      newGameState = 'finished';
      // Show all board cards when hand finishes
      newBoardCards = getBoardCardsForStreet('river', state.deck);
      
      // Determine winners (simplified - just pick players who didn't fold)
      const activePlayers = newPlayers.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        newWinners = [activePlayers[0].id];
        // Give pot to winner
        activePlayers[0].stackSize += newPot;
      } else {
        // For simplicity, if multiple players remain, split pot equally
        newWinners = activePlayers.map(p => p.id);
        const winAmount = Math.floor(newPot / activePlayers.length);
        activePlayers.forEach(p => {
          p.stackSize += winAmount;
        });
      }
      
      // Add to hand history
      newHandHistory.push({
        handNumber: state.handCounter,
        winners: newWinners,
        pot: newPot,
        finalStreet: newStreet,
        completedAt: new Date().toLocaleTimeString()
      });
      
      newActionLog.push(`Hand finished! Winners: Player ${newWinners.join(', Player ')}`);
      
    } else if (shouldAdvanceStreet) {
      const currentStreetIndex = STREET_ORDER.indexOf(state.currentStreet);
      if (currentStreetIndex < STREET_ORDER.length - 1) {
        newStreet = STREET_ORDER[currentStreetIndex + 1];
        // Show board cards progressively
        newBoardCards = getBoardCardsForStreet(newStreet, state.deck);
        // Reset current bets for new street
        newPlayers.forEach(p => { p.currentBet = 0; });
        newActionLog.push(`--- ${newStreet.toUpperCase()} ---`);
      } else {
        newGameState = 'finished';
        newBoardCards = getBoardCardsForStreet('river', state.deck);
      }
    }
    
    return {
      ...state,
      players: newPlayers,
      currentPlayer: nextPlayer,
      pot: newPot,
      currentStreet: newStreet,
      gameState: newGameState,
      boardCards: newBoardCards,
      winners: newWinners,
      actionLog: newActionLog,
      handHistory: newHandHistory
    };
  }),
  
  getCurrentBet: () => getCurrentBet(get()),
  getValidActions: (playerId) => getValidActions(get(), playerId)
}));

// Helper functions
function generateDeck() {
  const suits = ['h', 'd', 'c', 's'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }
  
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getCurrentBet(state) {
  return Math.max(...state.players.map(p => p.currentBet));
}

function getValidActions(state, playerId) {
  if (state.gameState !== 'playing') return [];
  
  const player = state.players[playerId - 1];
  if (player.folded || player.allIn) return [];
  
  const currentBet = getCurrentBet(state);
  const actions = [];
  
  // Always can fold
  actions.push('fold');
  
  // Check if can check or must call
  if (currentBet === player.currentBet) {
    actions.push('check');
  } else {
    actions.push('call');
  }
  
  // Bet/Raise if has chips
  if (player.stackSize > 0) {
    if (currentBet === 0) {
      actions.push('bet');
    } else {
      actions.push('raise');
    }
    actions.push('all_in');
  }
  
  return actions;
}

function getNextGameState(state, players) {
  const activePlayers = players.filter(p => !p.folded);
  
  // Hand finished if only one player left
  if (activePlayers.length <= 1) {
    return { nextPlayer: state.currentPlayer, shouldAdvanceStreet: false, handFinished: true };
  }
  
  // Check if all active players are all-in or have matching bets
  const currentBet = Math.max(...players.map(p => p.currentBet));
  const playersWithAction = activePlayers.filter(p => !p.allIn && p.currentBet < currentBet);
  
  // If no players need to act, advance street
  if (playersWithAction.length === 0) {
    return { nextPlayer: 0, shouldAdvanceStreet: true, handFinished: false };
  }
  
  // Find next player to act
  let nextPlayer = (state.currentPlayer + 1) % 6;
  while (players[nextPlayer].folded || players[nextPlayer].allIn) {
    nextPlayer = (nextPlayer + 1) % 6;
  }
  
  return { nextPlayer, shouldAdvanceStreet: false, handFinished: false };
}

function getBoardCardsForStreet(street, deck) {
  // Skip hole cards (12 cards for 6 players) + burn cards
  const boardStart = 12;
  
  switch (street) {
    case 'preflop':
      return [];
    case 'flop':
      return deck.slice(boardStart + 1, boardStart + 4); // +1 for burn card
    case 'turn':
      return deck.slice(boardStart + 1, boardStart + 5); // Include turn
    case 'river':
      return deck.slice(boardStart + 1, boardStart + 6); // Include river
    default:
      return [];
  }
}