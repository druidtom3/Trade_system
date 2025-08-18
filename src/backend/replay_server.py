"""
Replay Server for K-line playback functionality
Provides real-time streaming of historical candle data
"""

import pandas as pd
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Generator, Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class ReplayServer:
    def __init__(self, data_processor):
        self.data_processor = data_processor
        self.is_playing = False
        self.current_session = None
        self.playback_thread = None
        self.speed = 1.0  # seconds per candle
        self.current_date = None
        self.current_index = 0
        self.total_candles = 0
        self.subscribers = []  # For SSE connections
        
    def start_replay(self, date: str, speed: float = 1.0) -> Dict:
        """
        Start K-line replay for specific date
        Args:
            date: Date string in YYYY-MM-DD format
            speed: Seconds per candle (1, 3, or 5)
        Returns:
            Dict with status and info
        """
        try:
            # Stop any existing replay
            self.stop_replay()
            
            # Load M1 data for the specified date
            logger.info(f"Loading M1 data for {date}")
            
            # Try to get data from the data processor
            # First, let's check if M1 data exists for this date
            m1_data = self._load_date_data(date, 'M1')
            
            if m1_data is None or len(m1_data) == 0:
                return {
                    'status': 'error',
                    'message': f'No M1 data available for {date}'
                }
            
            self.current_date = date
            self.speed = speed
            self.current_index = 0
            self.total_candles = len(m1_data)
            self.is_playing = False  # Will be set to True when play is called
            
            # Store data for streaming
            self.replay_data = m1_data
            
            logger.info(f"Replay prepared: {self.total_candles} candles for {date} at {speed}s/candle")
            
            return {
                'status': 'ready',
                'date': date,
                'total_candles': self.total_candles,
                'speed': speed,
                'message': f'Replay ready with {self.total_candles} candles'
            }
            
        except Exception as e:
            logger.error(f"Failed to start replay: {str(e)}")
            return {
                'status': 'error',
                'message': f'Failed to start replay: {str(e)}'
            }
    
    def _load_date_data(self, date: str, timeframe: str) -> Optional[pd.DataFrame]:
        """
        Load data for specific date and timeframe
        """
        try:
            # Check if data is already loaded in data_processor
            if timeframe in self.data_processor.loaded_data:
                df = self.data_processor.loaded_data[timeframe]
                
                # Filter for specific date
                target_date = pd.to_datetime(date).date()
                
                # Convert timestamp to datetime for filtering
                if 'timestamp' in df.columns:
                    df['datetime'] = pd.to_datetime(df['timestamp'], unit='s')
                    date_filtered = df[df['datetime'].dt.date == target_date].copy()
                    
                    if len(date_filtered) > 0:
                        logger.info(f"Found {len(date_filtered)} candles for {date} in {timeframe}")
                        return date_filtered.sort_values('timestamp')
                    
            logger.warning(f"No data found for {date} in {timeframe}")
            return None
            
        except Exception as e:
            logger.error(f"Error loading data for {date}: {str(e)}")
            return None
    
    def play_replay(self):
        """Start/resume playback"""
        if not hasattr(self, 'replay_data') or self.replay_data is None:
            return {'status': 'error', 'message': 'No replay data loaded'}
            
        self.is_playing = True
        logger.info(f"Starting replay playback from index {self.current_index}")
        return {'status': 'playing'}
    
    def pause_replay(self):
        """Pause playback"""
        self.is_playing = False
        logger.info("Replay paused")
        return {'status': 'paused', 'current_index': self.current_index}
    
    def stop_replay(self):
        """Stop and reset playback"""
        self.is_playing = False
        self.current_index = 0
        self.current_date = None
        self.replay_data = None
        self.subscribers.clear()
        logger.info("Replay stopped")
        return {'status': 'stopped'}
    
    def set_speed(self, speed: float):
        """Change playback speed"""
        self.speed = speed
        logger.info(f"Replay speed changed to {speed}s/candle")
        return {'status': 'speed_updated', 'speed': speed}
    
    def get_status(self) -> Dict:
        """Get current replay status"""
        return {
            'is_playing': self.is_playing,
            'current_date': self.current_date,
            'current_index': self.current_index,
            'total_candles': self.total_candles,
            'speed': self.speed,
            'progress': (self.current_index / self.total_candles * 100) if self.total_candles > 0 else 0
        }
    
    def candle_stream_generator(self) -> Generator[str, None, None]:
        """
        Generator for Server-Sent Events (SSE) streaming
        Yields formatted candle data as SSE events
        """
        if not hasattr(self, 'replay_data') or self.replay_data is None:
            yield f"data: {json.dumps({'error': 'No replay data loaded'})}\n\n"
            return
            
        logger.info("Starting candle stream generator")
        
        while self.current_index < len(self.replay_data):
            if not self.is_playing:
                # If paused, still yield heartbeat to keep connection alive
                yield f"data: {json.dumps({'type': 'heartbeat', 'status': 'paused'})}\n\n"
                time.sleep(1)
                continue
                
            try:
                # Get current candle
                candle_row = self.replay_data.iloc[self.current_index]
                
                # Format candle data
                candle_data = {
                    'type': 'candle',
                    'timeframe': 'M1',
                    'timestamp': int(candle_row['timestamp']),
                    'time': int(candle_row['timestamp']),  # For LightweightCharts compatibility
                    'open': float(candle_row['Open']),
                    'high': float(candle_row['High']),
                    'low': float(candle_row['Low']),
                    'close': float(candle_row['Close']),
                    'volume': int(candle_row.get('Volume', 0)),
                    'index': self.current_index,
                    'progress': (self.current_index / self.total_candles * 100)
                }
                
                # Yield SSE formatted data
                yield f"data: {json.dumps(candle_data)}\n\n"
                
                # Move to next candle
                self.current_index += 1
                
                # Wait according to speed setting
                time.sleep(self.speed)
                
            except Exception as e:
                logger.error(f"Error in candle stream: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break
        
        # Stream finished
        logger.info("Candle stream finished")
        self.is_playing = False
        yield f"data: {json.dumps({'type': 'finished', 'message': 'Replay completed'})}\n\n"
    
    def get_candle_at_index(self, index: int) -> Optional[Dict]:
        """Get candle data at specific index"""
        if not hasattr(self, 'replay_data') or self.replay_data is None:
            return None
            
        if 0 <= index < len(self.replay_data):
            candle_row = self.replay_data.iloc[index]
            return {
                'timestamp': int(candle_row['timestamp']),
                'time': int(candle_row['timestamp']),
                'open': float(candle_row['Open']),
                'high': float(candle_row['High']),
                'low': float(candle_row['Low']),
                'close': float(candle_row['Close']),
                'volume': int(candle_row.get('Volume', 0))
            }
        return None
    
    def seek_to_index(self, index: int) -> Dict:
        """Seek to specific candle index"""
        if not hasattr(self, 'replay_data') or self.replay_data is None:
            return {'status': 'error', 'message': 'No replay data loaded'}
            
        if 0 <= index < len(self.replay_data):
            self.current_index = index
            logger.info(f"Seeked to index {index}")
            return {'status': 'seeked', 'index': index}
        else:
            return {'status': 'error', 'message': 'Index out of range'}