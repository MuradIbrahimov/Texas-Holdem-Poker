import React, { useState } from 'react';

interface ActionButtonsProps {
  onAction: (action: string, amount?: number) => void;
  currentBet: number;
  playerBet: number;
  playerStack: number;
  canCheck: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAction,
  currentBet,
  playerBet,
  playerStack,
  canCheck
}) => {
  const [betAmount, setBetAmount] = useState(40); // Start with big blind
  const BB_SIZE = 40;

  const canCall = currentBet > playerBet && playerStack > 0;
  const canBet = currentBet === 0 && playerStack > 0;
  const canRaise = currentBet > 0 && playerStack > (currentBet - playerBet);
  const callAmount = Math.min(currentBet - playerBet, playerStack);

  const adjustBet = (increment: number) => {
    const newAmount = betAmount + (increment * BB_SIZE);
    setBetAmount(Math.max(BB_SIZE, Math.min(newAmount, playerStack)));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold">Actions</h3>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction('fold')}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
        >
          Fold
        </button>

        <button
          onClick={() => onAction('check')}
          disabled={!canCheck}
          className={`px-4 py-2 rounded transition ${
            canCheck 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Check
        </button>

        <button
          onClick={() => onAction('call', callAmount)}
          disabled={!canCall}
          className={`px-4 py-2 rounded transition ${
            canCall 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Call {canCall ? `$${callAmount}` : ''}
        </button>

        <button
          onClick={() => onAction('allin')}
          disabled={playerStack === 0}
          className={`px-4 py-2 rounded transition ${
            playerStack > 0 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          All-in ${playerStack}
        </button>
      </div>

      {/* Bet/Raise controls */}
      {(canBet || canRaise) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustBet(-1)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              -
            </button>
            
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-center"
              min={BB_SIZE}
              max={playerStack}
            />
            
            <button
              onClick={() => adjustBet(1)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              +
            </button>

            <button
              onClick={() => onAction(canBet ? 'bet' : 'raise', betAmount)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition"
            >
              {canBet ? 'Bet' : 'Raise'} ${betAmount}
            </button>
          </div>
          
          <div className="text-xs text-gray-400">
            Increments: {BB_SIZE} (Big Blind)
          </div>
        </div>
      )}

      <div className="text-sm text-gray-400">
        Current bet: ${currentBet} | Your bet: ${playerBet} | Stack: ${playerStack}
      </div>
    </div>
  );
};

export default ActionButtons;