"""
Data processor for CSV files with performance optimization
"""

import pandas as pd
import numpy as np
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import logging
import time

sys.path.append(str(Path(__file__).parent.parent))
from utils.config import DATA_DIR, LOADING_CONFIG, DEFAULT_CANDLE_COUNT
from utils.continuity_config import CONTINUITY_CONFIG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.data_dir = DATA_DIR
        self.loaded_data = {}
        self.loading_progress = {
            'status': 'idle',
            'current_file': '',
            'total_files': 0,
            'processed_files': 0,
            'percentage': 0,
            'message': ''
        }
        
    def _update_progress(self, current_file='', processed_files=None, message=''):
        """Update loading progress"""
        if processed_files is not None:
            self.loading_progress['processed_files'] = processed_files
        if current_file:
            self.loading_progress['current_file'] = current_file
        if message:
            self.loading_progress['message'] = message
            
        if self.loading_progress['total_files'] > 0:
            self.loading_progress['percentage'] = int(
                (self.loading_progress['processed_files'] / self.loading_progress['total_files']) * 100
            )
    
    def get_loading_status(self):
        """Get current loading status"""
        return self.loading_progress
    
    def load_all_data(self, progress_callback=None):
        """Load all CSV files with progress tracking"""
        self.loading_progress['status'] = 'loading'
        self.loading_progress['message'] = 'Starting data load...'
        
        csv_files = list(self.data_dir.glob("MNQ_*.csv"))
        self.loading_progress['total_files'] = len(csv_files)
        
        for idx, file_path in enumerate(csv_files):
            try:
                timeframe = file_path.stem.split('_')[1]
                self._update_progress(
                    current_file=file_path.name,
                    processed_files=idx,
                    message=f'Loading {file_path.name}...'
                )
                
                # Call progress callback if provided
                if progress_callback:
                    progress_callback(file_path.name, idx + 1, len(csv_files))
                
                df = self._load_csv_optimized(file_path, timeframe)
                self.loaded_data[timeframe] = df
                
                logger.info(f"Loaded {timeframe}: {len(df)} rows")
                
            except Exception as e:
                logger.error(f"Error loading {file_path}: {str(e)}")
                
        self.loading_progress['status'] = 'completed'
        self.loading_progress['processed_files'] = len(csv_files)
        self.loading_progress['percentage'] = 100
        self.loading_progress['message'] = 'Data loading completed'
        
        # Final callback
        if progress_callback:
            progress_callback('All files loaded', len(csv_files), len(csv_files))
        
        return True
    
    def _load_csv_optimized(self, file_path, timeframe):
        """Optimized CSV loading with smart truncation"""
        start_time = time.time()
        
        dtypes = {
            'Open': np.float32,
            'High': np.float32,
            'Low': np.float32,
            'Close': np.float32,
            'Volume': np.int32
        }
        
        if CONTINUITY_CONFIG['smart_truncation']['enabled']:
            nrows = CONTINUITY_CONFIG['smart_truncation']['max_rows']
            df = pd.read_csv(file_path, nrows=nrows, dtype=dtypes, engine='c')
            
            if CONTINUITY_CONFIG['smart_truncation']['keep_recent']:
                total_rows = sum(1 for _ in open(file_path)) - 1
                if total_rows > nrows:
                    skiprows = total_rows - nrows + 1
                    df = pd.read_csv(file_path, skiprows=range(1, skiprows), dtype=dtypes, engine='c')
        else:
            df = pd.read_csv(file_path, dtype=dtypes, engine='c')
        
        try:
            if 'Time' in df.columns:
                df['DateTime'] = pd.to_datetime(df['Date'] + ' ' + df['Time'], format='%m/%d/%Y %H:%M')
            else:
                # For daily data without time column, set to market open time
                df['DateTime'] = pd.to_datetime(df['Date'] + ' 09:30:00', format='%m/%d/%Y %H:%M:%S')
        except:
            # Fallback to automatic parsing if format fails
            if 'Time' in df.columns:
                df['DateTime'] = pd.to_datetime(df['Date'] + ' ' + df['Time'])
            else:
                df['DateTime'] = pd.to_datetime(df['Date'] + ' 09:30:00')
        
        df['timestamp'] = df['DateTime'].astype(np.int64) // 10**9
        
        if 'VWAP' in df.columns:
            df = df.drop('VWAP', axis=1)
        
        logger.info(f"Loaded {file_path.name} in {time.time() - start_time:.2f}s")
        
        return df
    
    def get_data_for_date(self, target_date, timeframe='M15', candle_count=DEFAULT_CANDLE_COUNT):
        """Get data for a specific date and timeframe - optimized version"""
        if timeframe not in self.loaded_data:
            logger.error(f"Timeframe {timeframe} not loaded")
            return None
            
        df = self.loaded_data[timeframe]  # Don't copy, work with reference
        
        if isinstance(target_date, str):
            target_date = pd.to_datetime(target_date).date()
            
        # Restore original logic but ensure data comes from the correct date range
        # Use vectorized filtering for better performance
        target_datetime = pd.to_datetime(target_date)
        
        # Define a reasonable cutoff time (end of trading day in UTC)
        # This ensures we get data from the trading session but avoid cross-date contamination
        cutoff_time = target_datetime.replace(hour=22, minute=0)  # 22:00 UTC = approx market close
        
        # Use boolean indexing directly without intermediate filtering
        mask = df['DateTime'] <= cutoff_time
        filtered_indices = df.index[mask]
        
        if len(filtered_indices) == 0:
            return None
            
        # Get the last N rows more efficiently
        start_idx = max(0, len(filtered_indices) - candle_count)
        selected_indices = filtered_indices[start_idx:]
        
        result_df = df.iloc[selected_indices].copy()  # Only copy the final result
        
        # Debug logging to check data continuity
        if len(result_df) > 1:
            first_time = result_df.iloc[0]['DateTime']
            last_time = result_df.iloc[-1]['DateTime']
            logger.info(f"Loaded {len(result_df)} candles for {target_date} in {timeframe}: {first_time} to {last_time}")
        
        return result_df.reset_index(drop=True)
    
    def get_random_date_data(self, timeframe='M15'):
        """Get data for a random trading date - optimized version"""
        if timeframe not in self.loaded_data:
            return None
            
        df = self.loaded_data[timeframe]
        
        # Use value_counts for better performance
        date_counts = df['Date'].value_counts()
        # Adjust minimum candle count based on timeframe
        min_candles = {
            'M1': 20, 'M5': 15, 'M15': 10, 
            'H1': 5, 'H4': 3, 'D1': 1
        }
        min_count = min_candles.get(timeframe, 5)
        valid_dates = date_counts[date_counts >= min_count].index.tolist()
        
        if not valid_dates:
            return None
            
        random_date = np.random.choice(valid_dates)
        
        return self.get_data_for_date(random_date, timeframe)
        
    def get_common_random_date(self):
        """Get a random date that has data available in ALL timeframes"""
        all_dates = set()
        
        # Get dates from each timeframe that have sufficient data
        timeframe_dates = {}
        min_candles = {
            'M1': 20, 'M5': 15, 'M15': 10, 
            'H1': 5, 'H4': 3, 'D1': 1
        }
        
        for timeframe in ['M1', 'M5', 'M15', 'H1', 'H4', 'D1']:
            if timeframe not in self.loaded_data:
                continue
                
            df = self.loaded_data[timeframe]
            date_counts = df['Date'].value_counts()
            min_count = min_candles.get(timeframe, 5)
            valid_dates = date_counts[date_counts >= min_count].index.tolist()
            
            timeframe_dates[timeframe] = set(valid_dates)
            
            if not all_dates:
                all_dates = set(valid_dates)
            else:
                all_dates = all_dates.intersection(set(valid_dates))
        
        if not all_dates:
            # Fallback: if no common dates, use M1 dates as priority
            logger.warning("No common dates found across all timeframes, using M1 dates as fallback")
            if 'M1' in timeframe_dates:
                all_dates = timeframe_dates['M1']
            else:
                return None
                
        # Convert to list and select random date
        common_dates = list(all_dates)
        if not common_dates:
            return None
            
        random_date = np.random.choice(common_dates)
        
        logger.info(f"Selected common random date: {random_date} (available in {len([tf for tf, dates in timeframe_dates.items() if random_date in dates])} timeframes)")
        
        return random_date
    
    def prepare_chart_data(self, df):
        """Prepare data for chart display - vectorized version"""
        if df is None or df.empty:
            return []
            
        # Use vectorized operations instead of iterrows for much better performance
        chart_data = {
            'time': df['timestamp'].astype(int).tolist(),
            'open': df['Open'].astype(float).tolist(),
            'high': df['High'].astype(float).tolist(),
            'low': df['Low'].astype(float).tolist(),
            'close': df['Close'].astype(float).tolist(),
            'volume': df['Volume'].astype(int).tolist()
        }
        
        # Convert to list of dictionaries
        return [
            {
                'time': chart_data['time'][i],
                'open': chart_data['open'][i],
                'high': chart_data['high'][i],
                'low': chart_data['low'][i],
                'close': chart_data['close'][i],
                'volume': chart_data['volume'][i]
            }
            for i in range(len(chart_data['time']))
        ]
    
    def _convert_to_json_serializable(self, obj):
        """Convert numpy types to JSON serializable types"""
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        elif isinstance(obj, (pd.Series, pd.DataFrame)):
            return obj.to_dict()
        elif isinstance(obj, dict):
            return {k: self._convert_to_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_json_serializable(item) for item in obj]
        else:
            return obj