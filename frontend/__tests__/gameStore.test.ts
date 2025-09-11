// frontend/src/__tests__/gameStore.test.ts

import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../store/gameStore';

describe('GameStore Integration Tests', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.setState({
      gameState: 'setup',
      currentStreet: 'preflop',
      currentPlayer: 0,
      pot: 0,
      winners: [],
      actionLog: [],
      handHistory: [],
      handCounter: 0,
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
      playersActedThisStreet: new Set()
    });
  });

  test('should initialize game with correct default state', () => {
    const { result } = renderHook(() => useGameStore());
    
    expect(result.current.gameState).toBe('setup');
    expect(result.current.players).toHaveLength(6);
    expect(result.current.pot).toBe(0);
    expect(result.current.smallBlind).toBe(20);
    expect(result.current.bigBlind).toBe(40);
  });

  test('should start a new game and post blinds correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.resetGame();
    });
    
    expect(result.current.gameState).toBe('playing');
    expect(result.current.currentStreet).toBe('preflop');
    expect(result.current.currentPlayer).toBe(3); // UTG position
    expect(result.current.pot).toBe(60); // SB + BB = 20 + 40
    
    // Check that blinds were posted
    expect(result.current.players[1].stackSize).toBe(980); // SB posted 20
    expect(result.current.players[2].stackSize).toBe(960); // BB posted 40
    expect(result.current.players[1].currentBet).toBe(20);
    expect(result.current.players[2].currentBet).toBe(40);
  });

  test('should handle player actions correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    // Start game
    act(() => {
      result.current.resetGame();
    });
    
    // Player 4 (UTG) calls
    act(() => {
      result.current.playerAction(4, 'call');
    });
    
    expect(result.current.players[3].currentBet).toBe(40);
    expect(result.current.players[3].stackSize).toBe(960);
    expect(result.current.currentPlayer).toBe(4); // Next player
    expect(result.current.pot).toBe(100); // 60 + 40
  });

  test('should advance streets correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    // Start game
    act(() => {
      result.current.resetGame();
    });
    
    // Everyone calls preflop
    act(() => {
      result.current.playerAction(4, 'call'); // UTG
      result.current.playerAction(5, 'call'); // UTG+1
      result.current.playerAction(6, 'call'); // BTN
      result.current.playerAction(1, 'call'); // SB
      result.current.playerAction(2, 'call'); // BB
      result.current.playerAction(3, 'check'); // BB checks
    });
    
    // Should advance to flop
    expect(result.current.currentStreet).toBe('flop');
    expect(result.current.boardCards.length).toBe(3); // Flop cards dealt
  });

  test('should determine winner when all fold except one', () => {
    const { result } = renderHook(() => useGameStore());
    
    // Start game
    act(() => {
      result.current.resetGame();
    });
    
    const initialPot = result.current.pot;
    
    // Everyone folds except BB
    act(() => {
      result.current.playerAction(4, 'fold'); // UTG
      result.current.playerAction(5, 'fold'); // UTG+1
      result.current.playerAction(6, 'fold'); // BTN
      result.current.playerAction(1, 'fold'); // SB
      result.current.playerAction(2, 'fold'); // BB wins
    });
    
    expect(result.current.gameState).toBe('finished');
    expect(result.current.winners).toContain(3); // Player 3 (BB) wins
  });

  test('should validate actions correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.resetGame();
    });
    
    // Get valid actions for current player (UTG)
    const validActions = result.current.getValidActions(4);
    
    expect(validActions).toContain('fold');
    expect(validActions).toContain('call');
    expect(validActions).toContain('raise');
    expect(validActions).not.toContain('check'); // Can't check when facing a bet
  });

  test('should handle all-in correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.resetGame();
    });
    
    const player4InitialStack = result.current.players[3].stackSize;
    
    // Player 4 goes all-in
    act(() => {
      result.current.playerAction(4, 'all_in');
    });
    
    expect(result.current.players[3].stackSize).toBe(0);
    expect(result.current.players[3].allIn).toBe(true);
    expect(result.current.pot).toBeGreaterThan(60); // Pot increased
  });

  test('should update hand history after game completion', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.resetGame();
    });
    
    const initialHistoryLength = result.current.handHistory.length;
    
    // Complete a hand by everyone folding
    act(() => {
      result.current.playerAction(4, 'fold');
      result.current.playerAction(5, 'fold');
      result.current.playerAction(6, 'fold');
      result.current.playerAction(1, 'fold');
      result.current.playerAction(2, 'fold');
    });
    
    expect(result.current.handHistory.length).toBe(initialHistoryLength + 1);
    expect(result.current.handHistory[0].winners).toBeDefined();
    expect(result.current.handHistory[0].pot).toBeGreaterThan(0);
  });
});

describe('GameStore Helper Functions', () => {
  test('should calculate current bet correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.resetGame();
    });
    
    const currentBet = result.current.getCurrentBet();
    expect(currentBet).toBe(40); // Big blind is the current bet preflop
  });

  test('should set stack sizes correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    const newStacks = [500, 1500, 2000, 800, 1200, 1000];
    
    act(() => {
      result.current.setStackSizes(newStacks);
    });
    
    newStacks.forEach((stack, index) => {
      expect(result.current.players[index].stackSize).toBe(stack);
    });
  });
});