// frontend/src/app/PokerTable.tsx - Fixed with all issues resolved

'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

// Types
interface CardProps {
  card?: string;
  hidden?: boolean;
}

interface PlayerProps {
  player: {
    id: number;
    stackSize: number;
    currentBet: number;
    holeCards: string[];
    folded: boolean;
    allIn: boolean;
  };
  position: number;
  isCurrentPlayer: boolean;
  isWinner: boolean;
}

// Card component
const Card: React.FC<CardProps> = ({ card, hidden = false }) => {
  if (hidden) {
    return (
      <div className="w-12 h-16 bg-blue-600 border border-gray-300 rounded shadow-sm flex items-center justify-center">
        <div className="text-white text-xs">🂠</div>
      </div>
    );
  }

  if (!card) return (
    <div className="w-12 h-16 bg-gray-200 border border-gray-300 rounded shadow-sm"></div>
  );

  const suit = card[1];
  const rank = card[0];
  const isRed = suit === 'h' || suit === 'd';
  
  const suitSymbol: { [key: string]: string } = {
    'h': '♥',
    'd': '♦', 
    'c': '♣',
    's': '♠'
  };

  return (
    <div className={`w-12 h-16 bg-white border border-gray-300 rounded shadow-sm flex flex-col items-center justify-center ${isRed ? 'text-red-500' : 'text-black'}`}>
      <div className="text-xs font-bold">{rank}</div>
      <div className="text-sm">{suitSymbol[suit]}</div>
    </div>
  );
};

// Player component
const Player: React.FC<PlayerProps> = ({ player, position, isCurrentPlayer, isWinner }) => {
  return (
    <div className={`p-3 border-2 rounded-lg shadow-lg ${
      isWinner ? 'bg-gradient-to-br from-yellow-200 to-amber-300 border-yellow-500' :
      isCurrentPlayer ? 'bg-gradient-to-br from-blue-100 to-cyan-200 border-blue-500 ring-2 ring-blue-300' : 
      'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-400'
    } ${player.folded ? 'opacity-60 grayscale' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-slate-800">Player {player.id}</h4>
        <span className="text-sm font-medium text-slate-600">Pos {position}</span>
      </div>
      
      <div className="flex gap-1 mb-2">
        {player.holeCards.map((card, index) => (
          <Card key={index} card={card} />
        ))}
      </div>
      
      <div className="text-sm space-y-1 font-medium">
        <div className="text-green-700">Stack: {player.stackSize}</div>
        <div className="text-blue-700">Bet: {player.currentBet}</div>
        {player.folded && <div className="text-red-600 font-bold">FOLDED</div>}
        {player.allIn && <div className="text-orange-600 font-bold">ALL IN</div>}
        {isWinner && <div className="text-yellow-700 font-bold">🏆 WINNER!</div>}
      </div>
    </div>
  );
};

// Setup component
const Setup: React.FC = () => {
  const { players, setStackSizes, resetGame, gameState } = useGameStore();
  const [stacks, setStacks] = useState<number[]>(() => players.map(p => p.stackSize));

  // Update stacks when players change
  useEffect(() => {
    setStacks(players.map(p => p.stackSize));
  }, [players]);

  const handleStackChange = (index: number, value: string) => {
    const newStacks = [...stacks];
    newStacks[index] = parseInt(value) || 1000;
    setStacks(newStacks);
  };

  const handleReset = () => {
    console.log('🔄 Setup: Reset button clicked');
    console.log('Current stacks:', stacks);
    setStackSizes(stacks);
    resetGame();
  };

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-indigo-500 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">🎮 Game Setup</h3>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stacks.map((stack, index) => (
          <div key={index}>
            <label className="block text-sm font-medium mb-1 text-indigo-100">
              Player {index + 1}
            </label>
            <input
              type="number"
              value={stack}
              onChange={(e) => handleStackChange(index, e.target.value)}
              className="w-full p-2 border rounded bg-white text-slate-800 font-medium"
              disabled={gameState === 'playing'}
              min={100}
              max={10000}
              step={100}
            />
          </div>
        ))}
      </div>
      
      <button
        onClick={handleReset}
        className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-md"
      >
        {gameState === 'setup' ? '🚀 Start Game' : '🔄 Reset Game'}
      </button>
      
      <div className="text-sm text-indigo-100 mt-2">
        {gameState === 'setup' 
          ? 'Set stack sizes and click Start to begin' 
          : 'Click Reset to start a new hand'}
      </div>
    </div>
  );
};

// Action Buttons component
const ActionButtons: React.FC = () => {
  const { 
    players, 
    currentPlayer, 
    bigBlind,
    gameState,
    playerAction,
    getValidActions,
    getCurrentBet 
  } = useGameStore();
  
  const [betAmount, setBetAmount] = useState<number>(bigBlind * 2);
  
  if (gameState !== 'playing') return null;
  
  const currentPlayerData = players[currentPlayer];
  const validActions = getValidActions(currentPlayer + 1);
  const currentBet = getCurrentBet();
  const callAmount = currentBet - currentPlayerData.currentBet;
  
  const handleAction = (action: string) => {
    console.log(`🎯 Action button: ${action} for player ${currentPlayer + 1}`);
    if (action === 'bet' || action === 'raise') {
      playerAction(currentPlayer + 1, action, betAmount);
    } else {
      playerAction(currentPlayer + 1, action);
    }
  };
  
  const adjustBetAmount = (increment: number) => {
    const newAmount = betAmount + increment;
    const minBet = currentBet > 0 ? currentBet + bigBlind : bigBlind;
    const maxBet = currentPlayerData.stackSize + currentPlayerData.currentBet;
    
    setBetAmount(Math.max(minBet, Math.min(newAmount, maxBet)));
  };
  
  if (currentPlayerData.folded || currentPlayerData.allIn) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg border-2 border-gray-500">
        <p className="text-center text-gray-200 font-medium">
          Player {currentPlayer + 1} {currentPlayerData.folded ? 'has folded' : 'is all-in'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">
        🎯 Player {currentPlayer + 1} Action
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Fold */}
        <button
          onClick={() => handleAction('fold')}
          disabled={!validActions.includes('fold')}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium disabled:from-gray-400 disabled:to-gray-500 hover:from-red-600 hover:to-red-700 transition-all duration-200"
        >
          Fold
        </button>
        
        {/* Check */}
        {validActions.includes('check') && (
          <button
            onClick={() => handleAction('check')}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200"
          >
            Check
          </button>
        )}
        
        {/* Call */}
        {validActions.includes('call') && callAmount > 0 && (
          <button
            onClick={() => handleAction('call')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            Call {callAmount}
          </button>
        )}
        
        {/* Bet/Raise */}
        {(validActions.includes('bet') || validActions.includes('raise')) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustBetAmount(-bigBlind)}
              className="px-3 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 transition-colors"
              disabled={betAmount <= (currentBet > 0 ? currentBet + bigBlind : bigBlind)}
            >
              -
            </button>
            
            <button
              onClick={() => handleAction(validActions.includes('bet') ? 'bet' : 'raise')}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
              disabled={betAmount > currentPlayerData.stackSize + currentPlayerData.currentBet}
            >
              {validActions.includes('bet') ? 'Bet' : 'Raise'} {betAmount}
            </button>
            
            <button
              onClick={() => adjustBetAmount(bigBlind)}
              className="px-3 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 transition-colors"
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
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
          >
            All In ({currentPlayerData.stackSize})
          </button>
        )}
      </div>
      
      <div className="text-sm text-gray-300 space-y-1">
        <p>💰 Stack: {currentPlayerData.stackSize}</p>
        <p>🎯 Current bet: {currentPlayerData.currentBet}</p>
        <p>📞 To call: {callAmount}</p>
      </div>
    </div>
  );
};

// Board component
const Board: React.FC = () => {
  const { boardCards, currentStreet, pot, winners, gameState } = useGameStore();
  
  return (
    <div className="p-6 bg-gradient-to-br from-green-700 to-emerald-800 border-2 border-green-600 rounded-lg shadow-xl">
      <div className="text-center mb-4">
        <h3 className="text-white text-xl font-bold mb-2">
          {currentStreet.toUpperCase()}
        </h3>
        <div className="text-yellow-300 text-lg font-semibold">
          💰 Pot: {pot}
        </div>
        {gameState === 'finished' && winners.length > 0 && (
          <div className="text-yellow-200 text-lg font-bold mt-2 bg-yellow-600 bg-opacity-20 p-2 rounded">
            🏆 WINNER(S): Player {winners.join(', Player ')}!
          </div>
        )}
      </div>
      
      <div className="flex gap-3 justify-center">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} card={boardCards[index]} />
        ))}
      </div>
    </div>
  );
};

// Play Log component
const PlayLog: React.FC = () => {
  const { actionLog, currentStreet } = useGameStore();
  
  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">📝 Play Log</h3>
      <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
        <div className="font-medium text-yellow-400">Street: {currentStreet.toUpperCase()}</div>
        {actionLog.map((log, index) => (
          <div key={index} className="text-green-300">{log}</div>
        ))}
      </div>
    </div>
  );
};

// Hand History component
const HandHistory: React.FC = () => {
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
              <div className="text-gray-400 text-xs">{hand.completedAt}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main Poker Table component
const PokerTable: React.FC = () => {
  const { players, currentPlayer, gameState, winners, evaluateHand } = useGameStore();
  
  // Auto-evaluate when game enters 'evaluating' state
  React.useEffect(() => {
    if (gameState === 'evaluating') {
      console.log('🎯 Auto-triggering hand evaluation...');
      evaluateHand();
    }
  }, [gameState, evaluateHand]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-white bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          🃏 Texas Hold'em Poker 🃏
        </h1>
        
        {/* Show evaluation status */}
        {gameState === 'evaluating' && (
          <div className="text-center mb-4">
            <div className="bg-yellow-600 bg-opacity-20 text-yellow-200 p-3 rounded-lg border border-yellow-600">
              🎯 Evaluating hands... Please wait
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Players 1-3 */}
          <div className="space-y-4">
            {players.slice(0, 3).map((player, index) => (
              <Player 
                key={player.id} 
                player={player} 
                position={index}
                isCurrentPlayer={gameState === 'playing' && currentPlayer === index}
                isWinner={winners.includes(player.id)}
              />
            ))}
          </div>
          
          {/* Center column - Board and controls */}
          <div className="space-y-4">
            <Board />
            <Setup />
            <ActionButtons />
            <PlayLog />
            <HandHistory />
          </div>
          
          {/* Right column - Players 4-6 */}
          <div className="space-y-4">
            {players.slice(3, 6).map((player, index) => (
              <Player 
                key={player.id} 
                player={player} 
                position={index + 3}
                isCurrentPlayer={gameState === 'playing' && currentPlayer === index + 3}
                isWinner={winners.includes(player.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokerTable;