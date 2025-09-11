// frontend/src/store/gameStore.ts - Complete fix for all issues

import { create } from 'zustand';

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
  gameState: 'setup' | 'playing' | 'finished';
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
  playersActedThisStreet: Set<number>; // Track who acted this street
  
  // Actions
  resetGame: () => void;
  setStackSizes: (stacks: number[]) => void;
  playerAction: (playerId: number, action: string, amount?: number) => void;
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
  
  resetGame: () => set((state) => {
    console.log('🎮 Reset game called');
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
    newPlayers[1].currentBet = state.smallBlind;
    newPlayers[1].totalBet = state.smallBlind;
    newPlayers[1].stackSize -= state.smallBlind;
    newPlayers[2].currentBet = state.bigBlind;
    newPlayers[2].totalBet = state.bigBlind;
    newPlayers[2].stackSize -= state.bigBlind;
    
    return {
      ...state,
      gameState: 'playing',
      currentStreet: 'preflop',
      currentPlayer: 3, // UTG
      pot: state.smallBlind + state.bigBlind,
      players: newPlayers,
      boardCards: [],
      deck: deck,
      winners: [],
      actionLog: [`New hand started - Hand #${state.handCounter + 1}`, `SB: Player 2 (${state.smallBlind})`, `BB: Player 3 (${state.bigBlind})`],
      handCounter: state.handCounter + 1,
      playersActedThisStreet: new Set() // Reset acted players
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
    let newGameState: 'setup' | 'playing' | 'finished' = state.gameState;
    let newBoardCards = [...state.boardCards];
    let newWinners: number[] = [];
    let newHandHistory = [...state.handHistory];
    let finalPlayersActedThisStreet = newPlayersActedThisStreet;
    
    if (handFinished) {
      console.log('🏁 Hand finished!');
      newGameState = 'finished';
      newBoardCards = getBoardCardsForStreet('river', state.deck);
      
      const activePlayers = newPlayers.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        newWinners = [activePlayers[0].id];
        activePlayers[0].stackSize += newPot;
        newActionLog.push(`🏆 Player ${activePlayers[0].id} wins the pot (${newPot})!`);
      } else {
        // Multiple players - split pot for now (could add hand evaluation later)
        newWinners = activePlayers.map(p => p.id);
        const winAmount = Math.floor(newPot / activePlayers.length);
        activePlayers.forEach(p => {
          p.stackSize += winAmount;
        });
        newActionLog.push(`🏆 Split pot! Players ${newWinners.join(', ')} each win ${winAmount}`);
      }
      
      newHandHistory.push({
        handNumber: state.handCounter,
        winners: newWinners,
        pot: newPot,
        finalStreet: newStreet,
        completedAt: new Date().toLocaleTimeString()
      });
      
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
        }
        nextPlayer = firstToAct;
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
      handHistory: newHandHistory,
      playersActedThisStreet: finalPlayersActedThisStreet
    };
  }),
  
  getCurrentBet: () => getCurrentBet(get()),
  getValidActions: (playerId: number) => getValidActions(get(), playerId)
}));