// frontend/src/app/PokerTable.tsx - Updated with shadcn/ui components

'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import HandHistory from './HandHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Card component
const PokerCard: React.FC<{ card?: string; hidden?: boolean }> = ({ card, hidden = false }) => {
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

// Player component using Card from shadcn/ui
const Player: React.FC<any> = ({ player, position, isCurrentPlayer, isWinner }) => {
  return (
    <Card className={`${
      isWinner ? 'ring-2 ring-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100' :
      isCurrentPlayer ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-cyan-100' : 
      ''
    } ${player.folded ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-slate-800">Player {player.id}</h4>
          <span className="text-sm font-medium text-slate-600">Pos {position}</span>
        </div>
        
        <div className="flex gap-1 mb-2">
          {player.holeCards.map((card: string, index: number) => (
            <PokerCard key={index} card={card} />
          ))}
        </div>
        
        <div className="text-sm space-y-1 font-medium">
          <div className="text-green-700">Stack: {player.stackSize}</div>
          <div className="text-blue-700">Bet: {player.currentBet}</div>
          {player.folded && <div className="text-red-600 font-bold">FOLDED</div>}
          {player.allIn && <div className="text-orange-600 font-bold">ALL IN</div>}
          {isWinner && <div className="text-yellow-700 font-bold">🏆 WINNER!</div>}
        </div>
      </CardContent>
    </Card>
  );
};

// Setup component using shadcn/ui
const Setup: React.FC = () => {
  const { players, setStackSizes, resetGame, gameState } = useGameStore();
  const [stacks, setStacks] = useState<number[]>(() => players.map(p => p.stackSize));

  useEffect(() => {
    setStacks(players.map(p => p.stackSize));
  }, [players]);

  const handleStackChange = (index: number, value: string) => {
    const newStacks = [...stacks];
    newStacks[index] = parseInt(value) || 0;
    setStacks(newStacks);
  };

  const handleReset = () => {
    setStackSizes(stacks);
    resetGame();
  };

  const getButtonText = () => {
    if (gameState === 'setup') {
      return 'Start';
    } else if (gameState === 'finished') {
      return 'New Hand';
    } else {
      return 'Reset';
    }
  };

  const canStartGame = () => {
    const playersWithMoney = stacks.filter(stack => stack >= 40).length;
    return playersWithMoney >= 2;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎮 Game Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stacks.map((stack, index) => (
            <div key={index}>
              <Label htmlFor={`stack-${index}`}>
                Player {index + 1}
              </Label>
              <Input
                id={`stack-${index}`}
                type="number"
                value={stack}
                onChange={(e) => handleStackChange(index, e.target.value)}
                className={stack < 40 ? 'border-red-500' : ''}
                disabled={gameState === 'playing'}
                min={0}
                max={10000}
                step={100}
              />
              {stack < 40 && stack > 0 && (
                <p className="text-xs text-red-600 mt-1">Below minimum</p>
              )}
            </div>
          ))}
        </div>
        
        <Button
          onClick={handleReset}
          disabled={!canStartGame()}
          className="w-full"
          variant={canStartGame() ? "default" : "secondary"}
        >
          {getButtonText()}
        </Button>
        
        {!canStartGame() && (
          <p className="text-sm text-yellow-600 mt-2 font-semibold">
            ⚠️ At least 2 players need 40+ chips to play
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Action Buttons using shadcn/ui
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>🎯 Player {currentPlayer + 1} Action</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={() => handleAction('fold')}
            disabled={!validActions.includes('fold')}
            variant="destructive"
          >
            Fold
          </Button>
          
          {validActions.includes('check') && (
            <Button
              onClick={() => handleAction('check')}
              variant="secondary"
            >
              Check
            </Button>
          )}
          
          {validActions.includes('call') && callAmount > 0 && (
            <Button
              onClick={() => handleAction('call')}
              variant="default"
            >
              Call {callAmount}
            </Button>
          )}
          
          {(validActions.includes('bet') || validActions.includes('raise')) && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => adjustBetAmount(-bigBlind)}
                variant="outline"
                size="sm"
              >
                -
              </Button>
              
              <Button
                onClick={() => handleAction(validActions.includes('bet') ? 'bet' : 'raise')}
                variant="default"
              >
                {validActions.includes('bet') ? 'Bet' : 'Raise'} {betAmount}
              </Button>
              
              <Button
                onClick={() => adjustBetAmount(bigBlind)}
                variant="outline"
                size="sm"
              >
                +
              </Button>
            </div>
          )}
          
          {validActions.includes('all_in') && currentPlayerData.stackSize > 0 && (
            <Button
              onClick={() => handleAction('all_in')}
              variant="default"
              className="bg-orange-500 hover:bg-orange-600"
            >
              All In ({currentPlayerData.stackSize})
            </Button>
          )}
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <p>💰 Stack: {currentPlayerData.stackSize}</p>
          <p>🎯 Current bet: {currentPlayerData.currentBet}</p>
          <p>📞 To call: {callAmount}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Board component using Card
const Board: React.FC = () => {
  const { boardCards, currentStreet, pot, winners, gameState } = useGameStore();
  
  return (
    <Card className="bg-gradient-to-br from-green-700 to-emerald-800">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-white text-xl font-bold mb-2">
            {currentStreet.toUpperCase()}
          </h3>
          <div className="text-yellow-300 text-lg font-semibold">
            💰 Pot: {pot}
          </div>
          {gameState === 'finished' && winners.length > 0 && (
            <div className="text-yellow-200 text-lg font-bold mt-2">
              🏆 WINNER(S): Player {winners.join(', Player ')}!
            </div>
          )}
        </div>
        
        <div className="flex gap-3 justify-center">
          {Array.from({ length: 5 }, (_, index) => (
            <PokerCard key={index} card={boardCards[index]} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Play Log component
const PlayLog: React.FC = () => {
  const { actionLog, currentStreet } = useGameStore();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Play Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
          <div className="font-medium text-yellow-600">Street: {currentStreet.toUpperCase()}</div>
          {actionLog.map((log, index) => (
            <div key={index} className="text-green-700">{log}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main component
const PokerTable: React.FC = () => {
  const { players, currentPlayer, gameState, winners, evaluateHand } = useGameStore();
  
  React.useEffect(() => {
    if (gameState === 'evaluating') {
      evaluateHand();
    }
  }, [gameState, evaluateHand]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          🃏 Texas Hold'em Poker 🃏
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          
          <div className="space-y-4">
            <Board />
            <Setup />
            <ActionButtons />
            <PlayLog />
            <HandHistory />
          </div>
          
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