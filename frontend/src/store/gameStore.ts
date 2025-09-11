
import { create } from 'zustand';

interface HandEvaluation {
  hand_uuid: string;
  winners: number[];
  pot_size: number;
  winnings_by_player: { [key: string]: number };
  best_hands: { [key: string]: string };
}

interface PlayerAction {
  action: string;
  amount: number;
  street: string;
}

interface Player {
  id: number;
  stackSize: number;
  currentBet: number;
  totalBet: number;
  holeCards: string[];
  folded: boolean;
  allIn: boolean;
  actions: PlayerAction[];
}

interface HandHistoryEntry {
  handNumber: number;
  winners: number[];
  pot: number;
  finalStreet: string;
  completedAt: string;
}

interface GameState {
  gameState: 'setup' | 'playing' | 'evaluating' | 'finished';
  currentStreet: 'preflop' | 'flop' | 'turn' | 'river';
  currentPlayer: number;
  pot: number;
  smallBlind: number;
  bigBlind: number;
  deck: string[];
  winners: number[];
  actionLog: string[];
  handHistory: HandHistoryEntry[];
  handCounter: number;
  players: Player[];
  boardCards: string[];
  playersActedThisStreet: Set<number>;
  
  // Actions
  resetGame: () => void;
  setStackSizes: (stacks: number[]) => void;
  playerAction: (playerId: number, action: string, amount?: number) => void;
  evaluateHand: () => Promise<void>;
  fetchHandHistory: () => Promise<void>;
  getCurrentBet: () => number;
  getValidActions: (playerId: number) => string[];
}

const STREET_ORDER: ('preflop' | 'flop' | 'turn' | 'river')[] = ['preflop', 'flop', 'turn', 'river'];

// Helper functions
function generateDeck(): string[] {
  const suits = ['h', 'd', 'c', 's'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: string[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }
  
  return deck;
}

function shuffle(array: string[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getCurrentBet(state: GameState): number {
  return Math.max(...state.players.map(p => p.currentBet));
}

function getValidActions(state: GameState, playerId: number): string[] {
  if (state.gameState !== 'playing') return [];
  
  const player = state.players[playerId - 1];
  if (player.folded || player.allIn) return [];
  
  const currentBet = getCurrentBet(state);
  const actions: string[] = [];
  
  actions.push('fold');
  
  if (currentBet === player.currentBet) {
    actions.push('check');
  } else {
    actions.push('call');
  }
  
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

function isBettingRoundComplete(state: GameState, players: Player[]): boolean {
  const activePlayers = players.filter(p => !p.folded);
  const currentBet = Math.max(...players.map(p => p.currentBet));
  
  // All active players must have acted this street
  const activePlayerIds = activePlayers.filter(p => !p.allIn).map(p => p.id);
  const allActedThisStreet = activePlayerIds.every(id => state.playersActedThisStreet.has(id));
  
  if (!allActedThisStreet) {
    return false;
  }
  
  // All active players must either match current bet or be all-in
  for (const player of activePlayers) {
    if (!player.allIn && player.currentBet < currentBet) {
      return false;
    }
  }
  
  return true;
}

function getNextGameState(state: GameState, players: Player[]) {
  const activePlayers = players.filter(p => !p.folded);
  
  // Hand finished if only one player left
  if (activePlayers.length <= 1) {
    return { nextPlayer: state.currentPlayer, shouldAdvanceStreet: false, handFinished: true };
  }
  
  // Check if betting round is complete
  if (isBettingRoundComplete(state, players)) {
    return { nextPlayer: 0, shouldAdvanceStreet: true, handFinished: false };
  }
  
  // Find next player to act
  let nextPlayer = (state.currentPlayer + 1) % 6;
  let attempts = 0;
  
  while (attempts < 6) {
    const player = players[nextPlayer];
    if (!player.folded && !player.allIn) {
      break;
    }
    nextPlayer = (nextPlayer + 1) % 6;
    attempts++;
  }
  
  if (attempts >= 6) {
    return { nextPlayer: state.currentPlayer, shouldAdvanceStreet: false, handFinished: true };
  }
  
  return { nextPlayer, shouldAdvanceStreet: false, handFinished: false };
}

function getBoardCardsForStreet(street: string, deck: string[]): string[] {
  const boardStart = 12;
  
  switch (street) {
    case 'preflop':
      return [];
    case 'flop':
      return deck.slice(boardStart + 1, boardStart + 4);
    case 'turn':
      return deck.slice(boardStart + 1, boardStart + 5);
    case 'river':
      return deck.slice(boardStart + 1, boardStart + 6);
    default:
      return [];
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  gameState: 'setup',
  currentStreet: 'preflop',
  currentPlayer: 0,
  pot: 0,
  smallBlind: 20,
  bigBlind: 40,
  deck: [],
  winners: [],
  actionLog: [],
  handHistory: [],
  handCounter: 0,
  playersActedThisStreet: new Set(),
  
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
  
  boardCards: [],
  
// Update the resetGame function in gameStore.ts

resetGame: () => set((state) => {
  console.log('🎮 Reset game called');
  const deck = generateDeck();
  shuffle(deck);
  
  // Filter out players who can't afford to play
  const playablePlayers = state.players.filter(p => p.stackSize >= 40);
  
  if (playablePlayers.length < 2) {
    console.log('❌ Not enough players with sufficient funds');
    alert('At least 2 players need 40+ chips to play!');
    return state; // Don't start the game
  }
  
  const newPlayers = state.players.map((player, index) => {
    // Mark broke players as folded from the start
    const canPlay = player.stackSize >= 40;
    
    const newPlayer = {
      ...player,
      holeCards: canPlay ? [deck[index * 2], deck[index * 2 + 1]] : [],
      currentBet: 0,
      totalBet: 0,
      folded: !canPlay, // Automatically fold broke players
      allIn: false,
      actions: []
    };
    
    // Only post blinds if player can afford it
    if (index === 1 && canPlay && player.stackSize >= state.smallBlind) {
      // Small blind
      newPlayer.currentBet = Math.min(state.smallBlind, player.stackSize);
      newPlayer.totalBet = newPlayer.currentBet;
      newPlayer.stackSize -= newPlayer.currentBet;
      if (newPlayer.stackSize === 0) newPlayer.allIn = true;
    } else if (index === 2 && canPlay && player.stackSize >= state.bigBlind) {
      // Big blind
      newPlayer.currentBet = Math.min(state.bigBlind, player.stackSize);
      newPlayer.totalBet = newPlayer.currentBet;
      newPlayer.stackSize -= newPlayer.currentBet;
      if (newPlayer.stackSize === 0) newPlayer.allIn = true;
    }
    
    return newPlayer;
  });
  
  // Calculate initial pot
  const initialPot = newPlayers.reduce((sum, p) => sum + p.currentBet, 0);
  
  // Find first player to act (skip folded/broke players)
  let firstToAct = 3; // UTG position
  while (firstToAct < 6 && (newPlayers[firstToAct].folded || newPlayers[firstToAct].allIn)) {
    firstToAct++;
  }
  if (firstToAct >= 6) {
    // Wrap around if needed
    firstToAct = 0;
    while (firstToAct < 6 && (newPlayers[firstToAct].folded || newPlayers[firstToAct].allIn)) {
      firstToAct++;
    }
  }
  
  // Build action log
  const actionLog = [`New hand started - Hand #${state.handCounter + 1}`];
  
  // Add blind postings to log
  if (newPlayers[1].currentBet > 0) {
    actionLog.push(`SB: Player 2 (${newPlayers[1].currentBet})`);
  }
  if (newPlayers[2].currentBet > 0) {
    actionLog.push(`BB: Player 3 (${newPlayers[2].currentBet})`);
  }
  
  // Note broke players
  const brokePlayers = state.players
    .map((p, i) => p.stackSize < 40 ? i + 1 : null)
    .filter(p => p !== null);
  
  if (brokePlayers.length > 0) {
    actionLog.push(`Players out (insufficient funds): ${brokePlayers.join(', ')}`);
  }
  
  return {
    ...state,
    gameState: 'playing',
    currentStreet: 'preflop',
    currentPlayer: firstToAct,
    pot: initialPot,
    players: newPlayers,
    boardCards: [],
    deck: deck,
    winners: [],
    actionLog: actionLog,
    handCounter: state.handCounter + 1,
    playersActedThisStreet: new Set()
  };
}),
  
  setStackSizes: (stacks: number[]) => set((state) => {
    console.log('💰 Setting stack sizes:', stacks);
    return {
      ...state,
      players: state.players.map((player, index) => ({
        ...player,
        stackSize: stacks[index] || player.stackSize
      }))
    };
  }),
  
  playerAction: (playerId: number, action: string, amount: number = 0) => set((state) => {
    console.log(`🎯 Player ${playerId} action: ${action} ${amount}`);
    
    if (state.gameState !== 'playing') return state;
    
    const playerIndex = playerId - 1;
    const newPlayers = [...state.players];
    const player = newPlayers[playerIndex];
    
    if (player.folded || player.allIn) return state;
    
    let actionAmount = amount;
    const currentBet = getCurrentBet(state);
    
    // Mark this player as having acted this street
    const newPlayersActedThisStreet = new Set(state.playersActedThisStreet);
    newPlayersActedThisStreet.add(playerId);
    
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'check':
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
        if (amount <= currentBet) return state;
        actionAmount = amount - player.currentBet;
        if (actionAmount > player.stackSize) actionAmount = player.stackSize;
        player.currentBet += actionAmount;
        player.totalBet += actionAmount;
        player.stackSize -= actionAmount;
        if (player.stackSize === 0) player.allIn = true;
        // Reset acted players when someone bets/raises
        newPlayersActedThisStreet.clear();
        newPlayersActedThisStreet.add(playerId);
        break;
        
      case 'all_in':
        actionAmount = player.stackSize;
        player.currentBet += actionAmount;
        player.totalBet += actionAmount;
        player.stackSize = 0;
        player.allIn = true;
        // Reset acted players when someone goes all-in with a raise
        if (player.currentBet > currentBet) {
          newPlayersActedThisStreet.clear();
          newPlayersActedThisStreet.add(playerId);
        }
        break;
        
      default:
        return state;
    }
    
    const actionText = `Player ${player.id}: ${action}${actionAmount > 0 ? ` ${actionAmount}` : ''}`;
    const newActionLog = [...state.actionLog, actionText];
    
    player.actions.push({
      action,
      amount: actionAmount,
      street: state.currentStreet
    });
    
    const newPot = state.pot + actionAmount;
    let { nextPlayer, shouldAdvanceStreet, handFinished } = getNextGameState({
      ...state,
      playersActedThisStreet: newPlayersActedThisStreet
    }, newPlayers);
    
    let newStreet = state.currentStreet;
    let newGameState: 'setup' | 'playing' | 'evaluating' | 'finished' = state.gameState;
    let newBoardCards = [...state.boardCards];
    let newWinners: number[] = [];
    let newHandHistory = [...state.handHistory];
    let finalPlayersActedThisStreet = newPlayersActedThisStreet;
    
    // Handle hand finished
    if (handFinished) {
      console.log('🏁 Hand finished!');
      newBoardCards = getBoardCardsForStreet('river', state.deck);
      
      const activePlayers = newPlayers.filter(p => !p.folded);
      
      if (activePlayers.length === 1) {
        // Single winner by folds
        newGameState = 'finished';
        newWinners = [activePlayers[0].id];
        activePlayers[0].stackSize += newPot;
        newActionLog.push(`🏆 Player ${activePlayers[0].id} wins the pot (${newPot}) - all opponents folded!`);
        
        newHandHistory.push({
          handNumber: state.handCounter,
          winners: newWinners,
          pot: newPot,
          finalStreet: newStreet,
          completedAt: new Date().toLocaleTimeString()
        });
      } else if (activePlayers.length > 1) {
        // Multiple players - need evaluation
        console.log('🎲 Multiple players at showdown - triggering evaluation');
        newGameState = 'evaluating';
        newActionLog.push('--- SHOWDOWN ---');
      }
      
    } else if (shouldAdvanceStreet) {
      console.log('⬆️ Advancing street');
      const currentStreetIndex = STREET_ORDER.indexOf(state.currentStreet);
      
      if (currentStreetIndex < STREET_ORDER.length - 1) {
        newStreet = STREET_ORDER[currentStreetIndex + 1];
        newBoardCards = getBoardCardsForStreet(newStreet, state.deck);
        newPlayers.forEach(p => { p.currentBet = 0; });
        newActionLog.push(`--- ${newStreet.toUpperCase()} ---`);
        
        // Reset acted players for new street
        finalPlayersActedThisStreet = new Set();
        
        // Start with first active player
        let firstToAct = 0;
        while (newPlayers[firstToAct].folded || newPlayers[firstToAct].allIn) {
          firstToAct = (firstToAct + 1) % 6;
          if (firstToAct === 0 && newPlayers.every(p => p.folded || p.allIn)) {
            // All players are folded or all-in, end the hand
            handFinished = true;
            newGameState = 'evaluating';
            break;
          }
        }
        
        if (!handFinished) {
          nextPlayer = firstToAct;
        }
      } else {
        // We're on the river and betting is complete - time to showdown!
        console.log('🎰 River betting complete - going to showdown!');
        newGameState = 'evaluating';
        newBoardCards = getBoardCardsForStreet('river', state.deck);
        newActionLog.push('--- SHOWDOWN ---');
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
      handHistory: newHandHistory,
      playersActedThisStreet: finalPlayersActedThisStreet
    };
  }),
  
 
evaluateHand: async () => {
  const state = get();
  console.log('🎲 Evaluating hands...');
  
  // Allow evaluation in both 'evaluating' and 'finished' states
  if (state.gameState !== 'finished' && state.gameState !== 'evaluating') {
    console.log('❌ Cannot evaluate - game state is:', state.gameState);
    return;
  }
  
  // Prepare the API request
  const activePlayers = state.players.filter(p => !p.folded);
  
  if (activePlayers.length === 0) {
    console.log('❌ No active players to evaluate');
    return;
  }
  
  if (activePlayers.length === 1) {
    // Only one player left, they win by default
    const winner = activePlayers[0];
    set(state => ({
      ...state,
      winners: [winner.id],
      gameState: 'finished',
      actionLog: [
        ...state.actionLog,
        `🏆 Player ${winner.id} wins ${state.pot} chips! (all opponents folded)`
      ]
    }));
    winner.stackSize += state.pot;
    return;
  }
  
  // Format board cards for API - ensure exactly 10 valid card characters
  let boardCardsString = state.boardCards.join('');
  
  // If we don't have enough cards, pad with dummy valid cards
  const dummyCards = ['2c', '2d', '2h', '2s', '3c'];
  let cardIndex = 0;
  
  while (boardCardsString.length < 10) {
    boardCardsString += dummyCards[cardIndex % dummyCards.length];
    cardIndex++;
  }
  
  // Ensure it's exactly 10 characters
  boardCardsString = boardCardsString.substring(0, 10);
  
  // Prepare player data with CORRECT positions
  // In 6-max: Position 0 = Button, Position 1 = SB, Position 2 = BB, etc.
  const requestData = {
    players: state.players
      .filter(p => !p.folded)  // Only include non-folded players
      .map(player => {
        // Determine actual position based on player ID
        // Player 1 = BTN (position 0)
        // Player 2 = SB (position 1)
        // Player 3 = BB (position 2)
        // Player 4 = UTG (position 3)
        // Player 5 = UTG+1 (position 4)
        // Player 6 = CO (position 5)
        const position = player.id - 1;
        
        return {
          player_id: player.id,
          position: position,  // Actual position in the game
          hole_cards: player.holeCards.join(''),
          stack_size: player.stackSize + player.totalBet,
          actions: player.actions,
          folded: player.folded
        };
      }),
    board_cards: boardCardsString,
    pot_size: state.pot,
    small_blind: state.smallBlind,
    big_blind: state.bigBlind
  };
  
  try {
    console.log('📡 Sending to backend:', requestData);
    
    const response = await fetch('http://localhost:8000/hands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error('API request failed');
    }
    
    const result: HandEvaluation = await response.json();
    console.log('✅ Evaluation result:', result);
    
    // Update game state with results
    const newPlayers = [...state.players];
    const newActionLog = [...state.actionLog];
    const newHandHistory = [...state.handHistory];
    
    // Update winner stacks based on winnings
    Object.entries(result.winnings_by_player).forEach(([playerId, winnings]) => {
      const player = newPlayers.find(p => p.id === parseInt(playerId));
      if (player && winnings > 0) {
        player.stackSize += winnings;
      }
    });
    
    // Add winner announcement to log
    if (result.winners.length === 1) {
      const winnerId = result.winners[0];
      const handDesc = result.best_hands[winnerId] || 'Best hand';
      newActionLog.push(`🏆 Player ${winnerId} wins ${state.pot} chips with ${handDesc}!`);
    } else {
      newActionLog.push(`🏆 Split pot! Players ${result.winners.join(', ')} split ${state.pot} chips!`);
    }
    
    // Add hand details to log
    Object.entries(result.best_hands).forEach(([playerId, hand]) => {
      newActionLog.push(`Player ${playerId}: ${hand}`);
    });
    
    // Add to hand history
    newHandHistory.push({
      handNumber: state.handCounter,
      winners: result.winners,
      pot: state.pot,
      finalStreet: state.currentStreet,
      completedAt: new Date().toLocaleTimeString()
    });
    
    set({
      ...state,
      players: newPlayers,
      winners: result.winners,
      gameState: 'finished',
      actionLog: newActionLog,
      handHistory: newHandHistory
    });
    
  } catch (error) {
    console.error('❌ Error evaluating hand:', error);
    
    // Fallback: simple random winner for offline mode
    const activePlayers = state.players.filter(p => !p.folded);
    if (activePlayers.length > 0) {
      const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      const newPlayers = [...state.players];
      const winnerInArray = newPlayers.find(p => p.id === winner.id);
      if (winnerInArray) {
        winnerInArray.stackSize += state.pot;
      }
      
      set({
        ...state,
        players: newPlayers,
        winners: [winner.id],
        gameState: 'finished',
        actionLog: [
          ...state.actionLog,
          `🏆 Player ${winner.id} wins ${state.pot} chips! (offline/random evaluation)`
        ],
        handHistory: [
          ...state.handHistory,
          {
            handNumber: state.handCounter,
            winners: [winner.id],
            pot: state.pot,
            finalStreet: state.currentStreet,
            completedAt: new Date().toLocaleTimeString()
          }
        ]
      });
    }
  }
},
  
  fetchHandHistory: async () => {
    try {
      const response = await fetch('http://localhost:8000/hands');
      if (response.ok) {
        const data = await response.json();
        console.log('📜 Fetched hand history:', data);
      }
    } catch (error) {
      console.error('Failed to fetch hand history:', error);
    }
  },
  
  getCurrentBet: () => getCurrentBet(get()),
  getValidActions: (playerId: number) => getValidActions(get(), playerId)
}));