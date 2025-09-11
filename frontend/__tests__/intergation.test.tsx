// frontend/src/__tests__/integration.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokerTable from '../src/app/PokerTable';
import { useGameStore } from '../src/store/gameStore';

// Mock the fetch API
global.fetch = jest.fn();

describe('Poker Game Integration Tests', () => {
  beforeEach(() => {
    // Reset store and mocks
    useGameStore.setState({
      gameState: 'setup',
      currentStreet: 'preflop',
      currentPlayer: 0,
      pot: 0,
      winners: [],
      actionLog: [],
      handHistory: [],
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
    
    (fetch as jest.Mock).mockClear();
  });

  test('renders poker table with all components', () => {
    render(<PokerTable />);
    
    // Check title
    expect(screen.getByText('🃏 Texas Hold\'em Poker 🃏')).toBeInTheDocument();
    
    // Check all 6 players are rendered
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Player ${i}`)).toBeInTheDocument();
    }
    
    // Check game setup section
    expect(screen.getByText('🎮 Game Setup')).toBeInTheDocument();
    
    // Check Start button
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  test('can start a new game', () => {
    render(<PokerTable />);
    
    // Click Start button
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);
    
    // Check game state changed
    const state = useGameStore.getState();
    expect(state.gameState).toBe('playing');
    expect(state.pot).toBe(60); // SB + BB
    
    // Check action buttons appear
    expect(screen.getByText('🎯 Player 4 Action')).toBeInTheDocument();
  });

  test('can perform player actions', () => {
    render(<PokerTable />);
    
    // Start game
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);
    
    // Player 4 should be able to act
    const foldButton = screen.getByText('Fold');
    expect(foldButton).toBeInTheDocument();
    
    // Fold action
    fireEvent.click(foldButton);
    
    // Check state updated
    const state = useGameStore.getState();
    expect(state.players[3].folded).toBe(true);
    expect(state.currentPlayer).toBe(4); // Next player
  });

  test('disables invalid actions', () => {
    render(<PokerTable />);
    
    // Start game
    fireEvent.click(screen.getByText('Start'));
    
    // Check cannot be available when facing a bet
    expect(screen.queryByText('Check')).not.toBeInTheDocument();
    
    // Call should be available
    expect(screen.getByText(/Call/)).toBeInTheDocument();
  });

  test('shows winner when hand completes', async () => {
    render(<PokerTable />);
    
    // Mock API response for hand evaluation
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hand_uuid: 'test-uuid',
        winners: [1],
        pot_size: 240,
        winnings_by_player: { '1': 240, '2': -40, '3': -40 },
        best_hands: { '1': 'Pair of Aces' }
      })
    });
    
    // Start game and simulate everyone folding except player 1
    const { playerAction, resetGame } = useGameStore.getState();
    resetGame();
    
    // Simulate folds
    for (let i = 4; i <= 6; i++) {
      playerAction(i, 'fold');
    }
    playerAction(1, 'fold');
    playerAction(2, 'fold');
    
    // Check winner is displayed
    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.gameState).toBe('finished');
      expect(state.winners).toContain(3); // Player 3 (BB) wins
    });
  });

  test('validates minimum stack requirements', () => {
    render(<PokerTable />);
    
    // Set one player's stack to 0
    const { setStackSizes } = useGameStore.getState();
    setStackSizes([0, 1000, 1000, 1000, 1000, 1000]);
    
    // Re-render
    render(<PokerTable />);
    
    // Should show warning
    expect(screen.getByText(/At least 2 players need 40\+ chips/)).toBeInTheDocument();
  });

  test('updates hand history after completion', async () => {
    const { resetGame, playerAction } = useGameStore.getState();
    
    // Start and complete a hand
    resetGame();
    
    // Everyone folds except BB
    playerAction(4, 'fold');
    playerAction(5, 'fold');
    playerAction(6, 'fold');
    playerAction(1, 'fold');
    playerAction(2, 'fold');
    
    // Check hand history updated
    const state = useGameStore.getState();
    expect(state.handHistory.length).toBe(1);
    expect(state.handHistory[0].winners).toBeDefined();
  });
});

describe('Game Logic Tests', () => {
  test('calculates pot correctly', () => {
    const { resetGame, playerAction } = useGameStore.getState();
    resetGame();
    
    // Initial pot should be SB + BB
    expect(useGameStore.getState().pot).toBe(60);
    
    // Player 4 calls
    playerAction(4, 'call');
    expect(useGameStore.getState().pot).toBe(100);
  });

  test('handles all-in correctly', () => {
    const { resetGame, playerAction } = useGameStore.getState();
    resetGame();
    
    // Player 4 goes all-in
    playerAction(4, 'all_in');
    
    const state = useGameStore.getState();
    expect(state.players[3].allIn).toBe(true);
    expect(state.players[3].stackSize).toBe(0);
  });

  test('advances streets correctly', () => {
    const { resetGame, playerAction } = useGameStore.getState();
    resetGame();
    
    // Everyone calls/checks preflop
    playerAction(4, 'call');
    playerAction(5, 'call');
    playerAction(6, 'call');
    playerAction(1, 'call');
    playerAction(2, 'call');
    playerAction(3, 'check');
    
    // Should be on flop now
    expect(useGameStore.getState().currentStreet).toBe('flop');
    expect(useGameStore.getState().boardCards.length).toBe(3);
  });
});