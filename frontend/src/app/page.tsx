'use client';

import React, { useState, useEffect } from 'react';
import GameTable from '@/components/GameTable';
import ActionButtons from '@/components/ui/ActionButtons';
import Setup from '@/components/ui/Setup';
import PlayLog from '@/components/PlayLog';
import HandHistory from '@/components/HandHistory';

export interface Player {
  id: number;
  position: number;
  stack: number;
  holeCards: string;
  bet: number;
  folded: boolean;
  isDealer?: boolean;
  isSB?: boolean;
  isBB?: boolean;
}

export interface GameState {
  players: Player[];
  pot: number;
  board: string;
  currentBet: number;
  currentPlayer: number;
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  actions: string[];
  isHandActive: boolean;
}

const INITIAL_STACK = 1000;
const SMALL_BLIND = 20;
const BIG_BLIND = 40;

// Sample hole cards for testing
const SAMPLE_CARDS = ['AhAs', 'KhKs', 'QcQd', 'JhJs', 'ThTc', '9h9s'];
const SAMPLE_BOARDS = ['2h3d4c5s6h', '7h8h9hThJh', 'AcKcQcJcTc', '2c3d4h5s7c'];

export default function Home() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    pot: 0,
    board: '',
    currentBet: 0,
    currentPlayer: 0,
    street: 'preflop',
    actions: [],
    isHandActive: false
  });

  const [handHistory, setHandHistory] = useState<any[]>([]);
  const [stackSize, setStackSize] = useState(INITIAL_STACK);

  // Initialize players
  useEffect(() => {
    initializePlayers();
  }, []);

  // Fetch hand history on mount
  useEffect(() => {
    fetchHandHistory();
  }, []);

  const initializePlayers = (customStack?: number) => {
    const stack = customStack || stackSize;
    const newPlayers: Player[] = [];
    
    for (let i = 0; i < 6; i++) {
      newPlayers.push({
        id: i + 1,
        position: i,
        stack: stack,
        holeCards: '',
        bet: 0,
        folded: false,
        isDealer: i === 0,
        isSB: i === 1,
        isBB: i === 2
      });
    }

    setGameState({
      players: newPlayers,
      pot: 0,
      board: '',
      currentBet: 0,
      currentPlayer: 0,
      street: 'preflop',
      actions: [],
      isHandActive: false
    });
  };

  const startHand = () => {
    const newPlayers = gameState.players.map((player, index) => ({
      ...player,
      holeCards: SAMPLE_CARDS[index] || '2c3d',
      bet: 0,
      folded: false
    }));

    // Post blinds
    newPlayers[1].bet = SMALL_BLIND;
    newPlayers[1].stack -= SMALL_BLIND;
    newPlayers[2].bet = BIG_BLIND;
    newPlayers[2].stack -= BIG_BLIND;

    setGameState({
      ...gameState,
      players: newPlayers,
      pot: SMALL_BLIND + BIG_BLIND,
      currentBet: BIG_BLIND,
      currentPlayer: 3, // Start with player after BB
      street: 'preflop',
      actions: ['P2:sb20', 'P3:bb40'],
      isHandActive: true,
      board: SAMPLE_BOARDS[Math.floor(Math.random() * SAMPLE_BOARDS.length)]
    });
  };

  const handleAction = (action: string, amount?: number) => {
    const players = [...gameState.players];
    const currentPlayer = players[gameState.currentPlayer];
    let newPot = gameState.pot;
    let actionLog = `P${currentPlayer.id}:`;

    switch (action) {
      case 'fold':
        currentPlayer.folded = true;
        actionLog += 'f';
        break;
      case 'check':
        actionLog += 'x';
        break;
      case 'call':
        const callAmount = gameState.currentBet - currentPlayer.bet;
        currentPlayer.stack -= callAmount;
        currentPlayer.bet = gameState.currentBet;
        newPot += callAmount;
        actionLog += 'c';
        break;
      case 'bet':
        if (amount) {
          currentPlayer.stack -= amount;
          currentPlayer.bet = amount;
          newPot += amount;
          actionLog += `b${amount}`;
          setGameState(prev => ({ ...prev, currentBet: amount }));
        }
        break;
      case 'raise':
        if (amount) {
          const raiseAmount = amount - currentPlayer.bet;
          currentPlayer.stack -= raiseAmount;
          currentPlayer.bet = amount;
          newPot += raiseAmount;
          actionLog += `r${amount}`;
          setGameState(prev => ({ ...prev, currentBet: amount }));
        }
        break;
      case 'allin':
        const allinAmount = currentPlayer.stack;
        newPot += allinAmount;
        currentPlayer.bet += allinAmount;
        currentPlayer.stack = 0;
        actionLog += 'allin';
        break;
    }

    // Move to next active player
    let nextPlayer = (gameState.currentPlayer + 1) % 6;
    while (players[nextPlayer].folded && nextPlayer !== gameState.currentPlayer) {
      nextPlayer = (nextPlayer + 1) % 6;
    }

    setGameState({
      ...gameState,
      players,
      pot: newPot,
      currentPlayer: nextPlayer,
      actions: [...gameState.actions, actionLog]
    });

    // Check if hand should complete
    const activePlayers = players.filter(p => !p.folded);
    if (activePlayers.length === 1 || gameState.street === 'river') {
      setTimeout(() => completeHand(), 1000);
    }
  };

  const completeHand = async () => {
    // Prepare data for backend
    const handData = {
      players: gameState.players
        .filter(p => p.holeCards)
        .map(p => ({
          player_id: p.id,
          position: p.position,
          hole_cards: p.holeCards,
          stack_size: p.stack + p.bet,
          actions: [],
          folded: p.folded
        })),
      board_cards: gameState.board,
      pot_size: gameState.pot,
      small_blind: SMALL_BLIND,
      big_blind: BIG_BLIND
    };

    try {
      const response = await fetch('http://localhost:8000/hands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(handData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Hand completed:', result);
        
        // Show results
        alert(`Winners: Player(s) ${result.winners.join(', ')}\n` +
              `Best hands:\n${Object.entries(result.best_hands)
                .map(([id, hand]) => `Player ${id}: ${hand}`)
                .join('\n')}`);
        
        // Refresh hand history
        fetchHandHistory();
      }
    } catch (error) {
      console.error('Error completing hand:', error);
    }

    // Reset for next hand
    setGameState(prev => ({ ...prev, isHandActive: false }));
  };

  const fetchHandHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/hands');
      if (response.ok) {
        const hands = await response.json();
        setHandHistory(hands);
      }
    } catch (error) {
      console.error('Error fetching hand history:', error);
    }
  };

  return (
    <div className="min-h-screen bg-green-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Texas Hold'em Poker Tester
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-4">
            <GameTable gameState={gameState} />
            
            <div className="bg-gray-800 rounded-lg p-4">
              <Setup 
                onReset={startHand}
                onStackChange={setStackSize}
                stackSize={stackSize}
                isHandActive={gameState.isHandActive}
              />
            </div>
            
            {gameState.isHandActive && (
              <div className="bg-gray-800 rounded-lg p-4">
                <ActionButtons 
                  onAction={handleAction}
                  currentBet={gameState.currentBet}
                  playerBet={gameState.players[gameState.currentPlayer]?.bet || 0}
                  playerStack={gameState.players[gameState.currentPlayer]?.stack || 0}
                  canCheck={gameState.currentBet === (gameState.players[gameState.currentPlayer]?.bet || 0)}
                />
              </div>
            )}
          </div>
          
          {/* Side Panel */}
          <div className="space-y-4">
            <PlayLog actions={gameState.actions} />
            <HandHistory hands={handHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}