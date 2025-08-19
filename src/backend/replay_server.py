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
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from utils.config import TIMEFRAMES

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
        
        # Multi-timeframe support
        self.multi_timeframe_mode = True  # Enable multi-timeframe by default
        self.timeframe_data = {}  # Store data for all timeframes: {timeframe: dataframe}
        self.timeframe_indices = {}  # Track current index for each timeframe
        self.current_m1_timestamp = None  # Current M1 timestamp for synchronization
        
    def start_replay(self, date: str, speed: float = 1.0) -> Dict:
        """
        Start K-line replay for specific date with multi-timeframe support
        Args:
            date: Date string in YYYY-MM-DD format
            speed: Seconds per candle (1, 3, or 5)
        Returns:
            Dict with status and info
        """
        try:
            # Stop any existing replay
            self.stop_replay()
            
            logger.info(f"Loading multi-timeframe data for {date}")
            
            # Load data for all timeframes
            loaded_timeframes = []
            for timeframe in TIMEFRAMES:
                timeframe_data = self._load_date_data(date, timeframe)
                if timeframe_data is not None and len(timeframe_data) > 0:
                    self.timeframe_data[timeframe] = timeframe_data.sort_values('timestamp')
                    self.timeframe_indices[timeframe] = 0
                    loaded_timeframes.append(timeframe)
                    logger.info(f"Loaded {len(timeframe_data)} candles for {timeframe}")
                else:
                    logger.warning(f"No data available for {timeframe} on {date}")
            
            # Check if we have at least M1 data (minimum requirement)
            if 'M1' not in loaded_timeframes:
                return {
                    'status': 'error',
                    'message': f'No M1 data available for {date} - M1 is required for multi-timeframe replay'
                }
            
            self.current_date = date
            self.speed = speed
            self.current_index = 0
            self.total_candles = len(self.timeframe_data['M1'])
            self.is_playing = False
            
            # Store M1 data as primary data for backward compatibility
            self.replay_data = self.timeframe_data['M1']
            
            logger.info(f"Multi-timeframe replay prepared: {len(loaded_timeframes)} timeframes loaded for {date}")
            logger.info(f"Loaded timeframes: {loaded_timeframes}")
            
            return {
                'status': 'ready',
                'date': date,
                'total_candles': self.total_candles,
                'speed': speed,
                'loaded_timeframes': loaded_timeframes,
                'message': f'Multi-timeframe replay ready with {len(loaded_timeframes)} timeframes'
            }
            
        except Exception as e:
            logger.error(f"Failed to start multi-timeframe replay: {str(e)}")
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
                    
                    # Debug: Show data range for M1
                    if timeframe == 'M1':
                        min_date = df['datetime'].min().date()
                        max_date = df['datetime'].max().date()
                        logger.info(f"M1 data range: {min_date} to {max_date}, looking for {target_date}")
                    
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
        
        # Clear multi-timeframe data
        self.timeframe_data.clear()
        self.timeframe_indices.clear()
        self.current_m1_timestamp = None
        
        self.subscribers.clear()
        logger.info("Multi-timeframe replay stopped and cleared")
        return {'status': 'stopped'}
    
    def set_speed(self, speed: float):
        """Change playback speed"""
        self.speed = speed
        logger.info(f"Replay speed changed to {speed}s/candle")
        return {'status': 'speed_updated', 'speed': speed}
    
    def get_status(self) -> Dict:
        """Get current replay status with multi-timeframe information"""
        status = {
            'is_playing': self.is_playing,
            'current_date': self.current_date,
            'current_index': self.current_index,
            'total_candles': self.total_candles,
            'speed': self.speed,
            'progress': (self.current_index / self.total_candles * 100) if self.total_candles > 0 else 0,
            'multi_timeframe_mode': self.multi_timeframe_mode,
            'loaded_timeframes': list(self.timeframe_data.keys()),
            'current_m1_timestamp': self.current_m1_timestamp
        }
        
        # Add per-timeframe indices
        if self.timeframe_indices:
            status['timeframe_indices'] = self.timeframe_indices.copy()
            
        return status
    
    def candle_stream_generator(self) -> Generator[str, None, None]:
        """
        Generator for Server-Sent Events (SSE) streaming with multi-timeframe support
        Yields synchronized candle data for all loaded timeframes
        """
        if not hasattr(self, 'replay_data') or self.replay_data is None:
            yield f"data: {json.dumps({'error': 'No replay data loaded'})}\n\n"
            return
            
        logger.info("Starting multi-timeframe candle stream generator")
        
        while self.current_index < len(self.replay_data) if self.replay_data is not None else 0:
            if not self.is_playing:
                # If paused, still yield heartbeat to keep connection alive
                yield f"data: {json.dumps({'type': 'heartbeat', 'status': 'paused'})}\n\n"
                time.sleep(1)
                continue
                
            try:
                # Get current M1 candle timestamp for synchronization
                m1_candle_row = self.replay_data.iloc[self.current_index]
                current_timestamp = int(m1_candle_row['timestamp'])
                self.current_m1_timestamp = current_timestamp
                
                # Update M1 index in timeframe_indices
                self.timeframe_indices['M1'] = self.current_index
                
                # Get synchronized candles for all timeframes
                synchronized_candles = self._get_synchronized_candles(current_timestamp)
                
                # Create the multi-timeframe data package
                multi_tf_data = {
                    'type': 'multi_timeframe_candle',
                    'timestamp': current_timestamp,
                    'timeframes': synchronized_candles,
                    'primary_timeframe': 'M1',
                    'index': self.current_index,
                    'progress': (self.current_index / self.total_candles * 100),
                    'loaded_timeframes': list(self.timeframe_data.keys())
                }
                
                # Also send individual candle for backward compatibility
                if 'M1' in synchronized_candles:
                    m1_candle = synchronized_candles['M1'].copy()
                    m1_candle['type'] = 'candle'  # For backward compatibility
                    
                    # Send multi-timeframe data first
                    yield f"data: {json.dumps(multi_tf_data)}\n\n"
                    
                    # Then send M1 candle for backward compatibility
                    yield f"data: {json.dumps(m1_candle)}\n\n"
                else:
                    # Fallback: send only multi-timeframe data
                    yield f"data: {json.dumps(multi_tf_data)}\n\n"
                
                # Move to next candle
                self.current_index += 1
                
                # Wait according to speed setting
                time.sleep(self.speed)
                
            except Exception as e:
                logger.error(f"Error in multi-timeframe candle stream: {str(e)}")
                yield f"data: {json.dumps({'error': str(e), 'type': 'error'})}\n\n"
                break
        
        # Stream finished
        logger.info("Multi-timeframe candle stream finished")
        self.is_playing = False
        yield f"data: {json.dumps({'type': 'finished', 'message': 'Multi-timeframe replay completed'})}\n\n"
    
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
    
    def _get_synchronized_candles(self, m1_timestamp: int) -> Dict:
        """
        Get synchronized candles for all timeframes at given M1 timestamp
        This is the core synchronization algorithm for multi-timeframe replay
        """
        synchronized_candles = {}
        
        # Always include M1 candle as the base
        if 'M1' in self.timeframe_data:
            m1_data = self.timeframe_data['M1']
            m1_index = self.timeframe_indices.get('M1', 0)
            
            if m1_index < len(m1_data):
                candle_row = m1_data.iloc[m1_index]
                synchronized_candles['M1'] = {
                    'timeframe': 'M1',
                    'timestamp': int(candle_row['timestamp']),
                    'time': int(candle_row['timestamp']),
                    'open': float(candle_row['Open']),
                    'high': float(candle_row['High']),
                    'low': float(candle_row['Low']),
                    'close': float(candle_row['Close']),
                    'volume': int(candle_row.get('Volume', 0)),
                    'index': m1_index
                }
        
        # For other timeframes, find the candle that contains or is closest to this M1 timestamp
        for timeframe in ['M5', 'M15', 'H1', 'H4', 'D1']:
            if timeframe not in self.timeframe_data:
                continue
                
            tf_data = self.timeframe_data[timeframe]
            current_index = self.timeframe_indices.get(timeframe, 0)
            
            # Find the appropriate candle for this timeframe
            # We look for the candle that either contains this timestamp or is the most recent one
            best_index = current_index
            best_candle = None
            
            # Search forward and backward from current position to find best match
            for search_index in range(max(0, current_index - 2), min(len(tf_data), current_index + 3)):
                if search_index >= len(tf_data):
                    continue
                    
                candle = tf_data.iloc[search_index]
                candle_timestamp = int(candle['timestamp'])
                
                # Calculate timeframe duration in seconds
                tf_duration = self._get_timeframe_duration_seconds(timeframe)
                candle_start = candle_timestamp
                candle_end = candle_timestamp + tf_duration
                
                # Check if M1 timestamp falls within this timeframe candle's time range
                if candle_start <= m1_timestamp < candle_end:
                    best_index = search_index
                    best_candle = candle
                    break
                # Or if it's the most recent candle before our timestamp
                elif candle_timestamp <= m1_timestamp:
                    if best_candle is None or candle_timestamp > int(best_candle['timestamp']):
                        best_index = search_index
                        best_candle = candle
            
            if best_candle is not None:
                # Update the index for this timeframe if we found a better match
                if best_index != current_index:
                    self.timeframe_indices[timeframe] = best_index
                    
                synchronized_candles[timeframe] = {
                    'timeframe': timeframe,
                    'timestamp': int(best_candle['timestamp']),
                    'time': int(best_candle['timestamp']),
                    'open': float(best_candle['Open']),
                    'high': float(best_candle['High']),
                    'low': float(best_candle['Low']),
                    'close': float(best_candle['Close']),
                    'volume': int(best_candle.get('Volume', 0)),
                    'index': best_index
                }
        
        return synchronized_candles
    
    def _get_timeframe_duration_seconds(self, timeframe: str) -> int:
        """Get the duration of a timeframe in seconds"""
        duration_map = {
            'M1': 60,      # 1 minute
            'M5': 300,     # 5 minutes  
            'M15': 900,    # 15 minutes
            'H1': 3600,    # 1 hour
            'H4': 14400,   # 4 hours
            'D1': 86400    # 1 day
        }
        return duration_map.get(timeframe, 60)
    
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