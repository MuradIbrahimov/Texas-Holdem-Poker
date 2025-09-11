// frontend/src/app/PokerTable.tsx - Complete poker table with all components

'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Card component
const Card = ({ card, hidden = false }) => {
  if (hidden) {
    return (
      <div className="w-12 h-16 bg-blue-600 border border-gray-300 rounded shadow-sm flex items-center justify-center">
        <div className="text-white text-xs">🂠</div>
      </div>
    );
  }

  if (!card) return null;

  const suit = card[1];
  const rank = card[0];
  const isRed = suit === 'h' || suit === 'd';
  
  const suitSymbol = {
    'h': '♥',
    'd': '♦', 
    'c': '♣',
    's': '♠'
  }[suit];

  return (
    <div className={`w-12 h-16 bg-white border border-gray-300 rounded shadow-sm flex flex-col items-center justify-center ${isRed ? 'text-red-500' : 'text-black'}`}>
      <div className="text-xs font-bold">{rank}</div>
      <div className="text-sm">{suitSymbol}</div>
    </div>
  );
};

// Player component
const Player = ({ player, position, isCurrentPlayer }) => {
  return (
    <div className={`p-3 border rounded-lg ${isCurrentPlayer ? 'bg-yellow-100 border-yellow-400' : 'bg-white border-gray-300'} ${player.folded ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Player {player.id}</h4>
        <span className="text-sm text-gray-600">Pos {position}</span>
      </div>
      
      <div className="flex gap-1 mb-2">
        {player.holeCards.map((card, index) => (
          <Card key={index} card={card} />
        ))}
      </div>
      
      <div className="text-sm space-y-1">
        <div>Stack: {player.stackSize}</div>
        <div>Bet: {player.currentBet}</div>
        {player.folded && <div className="text-red-500">FOLDED</div>}
        {player.allIn && <div className="text-orange-500">ALL IN</div>}
      </div>
    </div>
  );
};

// Setup component
const Setup = () => {
  const { players, setStackSizes, resetGame, gameState } = useGameStore();
  const [stacks, setStacks] = useState(players.map(p => p.stackSize));

  const handleStackChange = (index, value) => {
    const newStacks = [...stacks];
    newStacks[index] = parseInt(value) || 1000;
    setStacks(newStacks);
  };

  const handleReset = () => {
    setStackSizes(stacks);
    resetGame();
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Game Setup</h3>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stacks.map((stack, index) => (
          <div key={index}>
            <label className="block text-sm font-medium mb-1">
              Player {index + 1}
            </label>
            <input
              type="number"
              value={stack}
              onChange={(e) => handleStackChange(index, e.target.value)}
              className="w-full p-2 border rounded"
              disabled={gameState === 'playing'}
            />
          </div>
        ))}
      </div>
      
      <button
        onClick={handleReset}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {gameState === 'setup' ? 'Start Game' : 'Reset Game'}
      </button>
    </div>
  );
};

// Action Buttons component
const ActionButtons = () => {
  const { 
    players, 
    currentPlayer, 
    bigBlind,
    gameState,
    playerAction,
    getValidActions,
    getCurrentBet 
  } = useGameStore();
  
  const [betAmount, setBetAmount] = useState(bigBlind * 2);
  
  if (gameState !== 'playing') return null;
  
  const currentPlayerData = players[currentPlayer];
  const validActions = getValidActions(currentPlayer + 1);
  const currentBet = getCurrentBet();
  const callAmount = currentBet - currentPlayerData.currentBet;
  
  const handleAction = (action) => {
    if (action === 'bet' || action === 'raise') {
      playerAction(currentPlayer + 1, action, betAmount);
    } else {
      playerAction(currentPlayer + 1, action);
    }
  };
  
  const adjustBetAmount = (increment) => {
    const newAmount = betAmount + increment;
    const minBet = currentBet > 0 ? currentBet + bigBlind : bigBlind;
    const maxBet = currentPlayerData.stackSize + currentPlayerData.currentBet;
    
    setBetAmount(Math.max(minBet, Math.min(newAmount, maxBet)));
  };
  
  // Disable all actions if player is folded or all-in
  if (currentPlayerData.folded || currentPlayerData.allIn) {
    return (
      <div className="p-4 bg-gray-100 rounded">
        <p className="text-center text-gray-600">
          Player {currentPlayer + 1} {currentPlayerData.folded ? 'has folded' : 'is all-in'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        Player {currentPlayer + 1} Action
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Fold */}
        <button
          onClick={() => handleAction('fold')}
          disabled={!validActions.includes('fold')}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Fold
        </button>
        
        {/* Check */}
        {validActions.includes('check') && (
          <button
            onClick={() => handleAction('check')}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Check
          </button>
        )}
        
        {/* Call */}
        {validActions.includes('call') && callAmount > 0 && (
          <button
            onClick={() => handleAction('call')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Call {callAmount}
          </button>
        )}
        
        {/* Bet/Raise */}
        {(validActions.includes('bet') || validActions.includes('raise')) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustBetAmount(-bigBlind)}
              className="px-2 py-1 bg-gray-300 rounded"
              disabled={betAmount <= (currentBet > 0 ? currentBet + bigBlind : bigBlind)}
            >
              -
            </button>
            
            <button
              onClick={() => handleAction(validActions.includes('bet') ? 'bet' : 'raise')}
              className="px-4 py-2 bg-purple-500 text-white rounded"
              disabled={betAmount > currentPlayerData.stackSize + currentPlayerData.currentBet}
            >
              {validActions.includes('bet') ? 'Bet' : 'Raise'} {betAmount}
            </button>
            
            <button
              onClick={() => adjustBetAmount(bigBlind)}
              className="px-2 py-1 bg-gray-300 rounded"
              disabled={betAmount >= currentPlayerData.stackSize + currentPlayerData.currentBet}
            >
              +
            </button>
          </div>
        )}
        
        {/* All In */}
        {validActions.includes('all_in') && currentPlayerData.stackSize > 0 && (
          <button
            onClick={() => handleAction('all_in')}
            className="px-4 py-2 bg-orange-500 text-white rounded font-bold"
          >
            All In ({currentPlayerData.stackSize})
          </button>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        <p>Stack: {currentPlayerData.stackSize}</p>
        <p>Current bet: {currentPlayerData.currentBet}</p>
        <p>To call: {callAmount}</p>
      </div>
    </div>
  );
};

// Board component
const Board = () => {
  const { boardCards, currentStreet, pot } = useGameStore();
  
  return (
    <div className="p-4 bg-green-700 border rounded-lg shadow-sm text-center">
      <h3 className="text-white text-lg font-semibold mb-4">
        {currentStreet.toUpperCase()} - Pot: {pot}
      </h3>
      
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} card={boardCards[index]} />
        ))}
      </div>
    </div>
  );
};

// Hand History component
const HandHistory = () => {
  const { handHistory } = useGameStore();
  
  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">📜 Hand History</h3>
      <div className="text-xs space-y-2 max-h-40 overflow-y-auto">
        {handHistory.length === 0 ? (
          <div className="text-gray-400 italic">No hands played yet</div>
        ) : (
          handHistory.map((hand, index) => (
            <div key={index} className="bg-slate-700 p-2 rounded border border-slate-600">
              <div className="text-yellow-400 font-medium">Hand #{hand.handNumber}</div>
              <div className="text-green-300">Winner: Player {hand.winners.join(', Player ')}</div>
              <div className="text-blue-300">Pot: {hand.pot}</div>
              <div className="text-gray-300">Street: {hand.finalStreet}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Play Log component
const PlayLog = () => {
  const { players, currentStreet } = useGameStore();
  
  const getLastActions = () => {
    const actions = [];
    players.forEach(player => {
      const lastAction = player.actions[player.actions.length - 1];
      if (lastAction) {
        actions.push(`P${player.id}: ${lastAction.action}${lastAction.amount ? ` ${lastAction.amount}` : ''}`);
      }
    });
    return actions;
  };
  
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Play Log</h3>
      <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
        <div className="font-medium">Current: {currentStreet}</div>
        {getLastActions().map((action, index) => (
          <div key={index} className="text-gray-600">{action}</div>
        ))}
      </div>
    </div>
  );
};

// Main Poker Table component
export default function PokerTable() {
  const { players, currentPlayer, gameState } = useGameStore();
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Texas Hold'em Poker</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Players 1-3 */}
          <div className="space-y-4">
            {players.slice(0, 3).map((player, index) => (
              <Player 
                key={player.id} 
                player={player} 
                position={index}
                isCurrentPlayer={gameState === 'playing' && currentPlayer === index}
              />
            ))}
          </div>
          
          {/* Center column - Board and controls */}
          <div className="space-y-4">
            <Board />
            <Setup />
            <ActionButtons />
            <PlayLog />
          </div>
          
          {/* Right column - Players 4-6 */}
          <div className="space-y-4">
            {players.slice(3, 6).map((player, index) => (
              <Player 
                key={player.id} 
                player={player} 
                position={index + 3}
                isCurrentPlayer={gameState === 'playing' && currentPlayer === index + 3}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}