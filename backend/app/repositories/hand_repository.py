import json
from typing import List, Optional
from datetime import datetime
from app.database import DatabaseConnection
from app.models.hand import HandResult, HandLogEntry, PlayerData


class HandRepository:
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
    
    def save_hand(
    #    Hand UUID,
    #    stack setting + which players were Dealer, Small blind, and Big Blind
    #    The third line shows what cards have the players received
    #    The fourth line is the action sequence in a short format
    #    The last (fifth) line should show winnings - how much each player won (+) or lost (-)
    )
    
    def get_all_hands(self) -> List[HandLogEntry]:
    #    Get all the hands , log them newest as first
    #    Hand UUID,
    #    stack setting + which players were Dealer, Small blind, and Big Blind
    #    what cards have the players received
    #    action sequence in a short format
    #    should show winnings - how much each player won (+) or lost (-)
        return hand_logs
    

        """Get a specific hand by ID"""
        query = """
            SELECT 
                id,
                players_data,
                board_cards,
                pot_size,
                results,
                created_at
            FROM hands
            WHERE id = %s
        """
        
        rows = self.db.execute_query(query, (hand_id,))
        
        if not rows:
            return None
        
        row = rows[0]
        players_data = json.loads(row['players_data'])
        results = json.loads(row['results'])
        
        return HandLogEntry(
            id=row['id'],
            players_count=len(players_data),
            pot_size=row['pot_size'],
            winners=results['winners'],
            board_cards=row['board_cards'],
            created_at=row['created_at']
        )
    
   
        """Get all hands for a specific player"""
        query = """
            SELECT 
                id,
                players_data,
                board_cards,
                pot_size,
                results,
                created_at
            FROM hands
            WHERE players_data::text LIKE %s
            ORDER BY created_at DESC
        """
        
        rows = self.db.execute_query(query, (f'%"player_id": {player_id}%',))
        hand_logs = []
        
        for row in rows:
            players_data = json.loads(row['players_data'])
            results = json.loads(row['results'])
            
            hand_logs.append(HandLogEntry(
                id=row['id'],
                players_count=len(players_data),
                pot_size=row['pot_size'],
                winners=results['winners'],
                board_cards=row['board_cards'],
                created_at=row['created_at']
            ))
        
        return hand_logs