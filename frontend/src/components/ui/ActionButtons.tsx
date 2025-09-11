// frontend/src/components/ui/ActionButtons.jsx - Fixed action buttons

import React, { useState } from 'react';
import { useGameStore } from '../../gameStore';

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
  
  const handleAction = (action:string) => {
    if (action === 'bet' || action === 'raise') {
      playerAction(currentPlayer + 1, action, betAmount);
    } else {
      playerAction(currentPlayer + 1, action);
    }
  };
  
  const adjustBetAmount = (increment:number) => {
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

export default ActionButtons;