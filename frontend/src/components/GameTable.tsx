import React from 'react';
import { GameState, Player } from '@/app/page';

interface GameTableProps {
  gameState: GameState;
}

const GameTable: React.FC<GameTableProps> = ({ gameState }) => {
  const { players, pot, board, currentPlayer, isHandActive } = gameState;

  const formatCards = (cards: string) => {
    if (!cards) return '??';
    // Split into 2-character cards
    return cards.match(/.{1,2}/g)?.join(' ') || cards;
  };

  const PlayerSeat = ({ player, index }: { player: Player; index: number }) => {
    const isActive = currentPlayer === index && isHandActive;
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
    
    return (
      <div 
        className={`
          bg-gray-700 rounded-lg p-3 w-32 text-white
          ${isActive ? 'ring-2 ring-yellow-400' : ''}
          ${player.folded ? 'opacity-50' : ''}
        `}
      >
        <div className="text-xs text-gray-400">
          Player {player.id} ({positions[index]})
        </div>
        <div className="font-mono text-sm mt-1">
          {player.holeCards ? formatCards(player.holeCards) : '-- --'}
        </div>
        <div className="text-sm mt-1">
          Stack: ${player.stack}
        </div>
        {player.bet > 0 && (
          <div className="text-yellow-300 text-sm">
            Bet: ${player.bet}
          </div>
        )}
        {player.folded && (
          <div className="text-red-400 text-xs mt-1">FOLDED</div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-green-800 rounded-xl p-8 relative">
      {/* Pot */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-center">
          <div className="text-sm text-gray-300">POT</div>
          <div className="text-2xl font-bold">${pot}</div>
        </div>
      </div>

      {/* Board Cards */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex gap-2">
          {board && board.match(/.{1,2}/g)?.map((card, i) => (
            <div key={i} className="bg-white rounded p-2 w-12 h-16 flex items-center justify-center font-mono text-lg">
              {card}
            </div>
          ))}
        </div>
      </div>

      {/* Player Seats - Positioned around the table */}
      <div className="relative h-96">
        {/* Top row */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          {players[0] && <PlayerSeat player={players[0]} index={0} />}
        </div>
        
        {/* Top sides */}
        <div className="absolute top-16 left-8">
          {players[5] && <PlayerSeat player={players[5]} index={5} />}
        </div>
        <div className="absolute top-16 right-8">
          {players[1] && <PlayerSeat player={players[1]} index={1} />}
        </div>
        
        {/* Bottom sides */}
        <div className="absolute bottom-16 left-8">
          {players[4] && <PlayerSeat player={players[4]} index={4} />}
        </div>
        <div className="absolute bottom-16 right-8">
          {players[2] && <PlayerSeat player={players[2]} index={2} />}
        </div>
        
        {/* Bottom */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          {players[3] && <PlayerSeat player={players[3]} index={3} />}
        </div>
      </div>

      {/* Street indicator */}
      {isHandActive && (
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded">
          {gameState.street.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default GameTable;