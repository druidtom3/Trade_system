"""
Candle continuity checker with performance optimization
"""

import pandas as pd
import numpy as np
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

class CandleContinuityChecker:
    def __init__(self):
        self.timeframe_minutes = {
            'M1': 1,
            'M5': 5,
            'M15': 15,
            'H1': 60,
            'H4': 240,
            'D1': 1440
        }
        
    def check_continuity(self, df, timeframe):
        """
        Check candle continuity using vectorized operations
        """
        if df.empty or len(df) < 2:
            return {
                'is_continuous': True,
                'gaps': [],
                'total_gaps': 0
            }
            
        minutes = self.timeframe_minutes.get(timeframe, 15)
        expected_diff = minutes * 60
        
        timestamps = df['timestamp'].values
        time_diffs = np.diff(timestamps)
        
        gap_mask = time_diffs > expected_diff * 1.5
        gap_indices = np.where(gap_mask)[0]
        
        gaps = []
        for idx in gap_indices:
            gap = {
                'index': int(idx),
                'from_time': int(timestamps[idx]),
                'to_time': int(timestamps[idx + 1]),
                'gap_minutes': int((timestamps[idx + 1] - timestamps[idx]) / 60)
            }
            gaps.append(gap)
        
        return {
            'is_continuous': len(gaps) == 0,
            'gaps': gaps,
            'total_gaps': len(gaps)
        }
    
    def fill_missing_candles(self, df, timeframe):
        """
        Fill missing candles with previous close price
        """
        if df.empty or len(df) < 2:
            return df
            
        minutes = self.timeframe_minutes.get(timeframe, 15)
        expected_diff = timedelta(minutes=minutes)
        
        df = df.copy()
        df['DateTime'] = pd.to_datetime(df['DateTime'])
        df = df.set_index('DateTime')
        
        freq_map = {
            'M1': '1T',
            'M5': '5T',
            'M15': '15T',
            'H1': '1H',
            'H4': '4H',
            'D1': '1D'
        }
        
        freq = freq_map.get(timeframe, '15T')
        
        df_resampled = df.resample(freq).agg({
            'Open': 'first',
            'High': 'max',
            'Low': 'min',
            'Close': 'last',
            'Volume': 'sum',
            'timestamp': 'first'
        })
        
        df_resampled['Close'] = df_resampled['Close'].fillna(method='ffill')
        df_resampled['Open'] = df_resampled['Open'].fillna(df_resampled['Close'])
        df_resampled['High'] = df_resampled['High'].fillna(df_resampled['Close'])
        df_resampled['Low'] = df_resampled['Low'].fillna(df_resampled['Close'])
        df_resampled['Volume'] = df_resampled['Volume'].fillna(0)
        
        df_resampled = df_resampled.reset_index()
        df_resampled['Date'] = df_resampled['DateTime'].dt.strftime('%m/%d/%Y')
        df_resampled['Time'] = df_resampled['DateTime'].dt.strftime('%H:%M')
        
        return df_resampled
    
    def validate_data_integrity(self, df):
        """
        Validate data integrity with vectorized checks
        """
        issues = []
        
        if df.empty:
            issues.append("Empty dataframe")
            return {'valid': False, 'issues': issues}
        
        has_nulls = df[['Open', 'High', 'Low', 'Close', 'Volume']].isnull().any().any()
        if has_nulls:
            issues.append("Contains null values")
        
        high_low_invalid = (df['High'] < df['Low']).any()
        if high_low_invalid:
            issues.append("High < Low detected")
        
        ohlc_invalid = ((df['High'] < df['Open']) | 
                       (df['High'] < df['Close']) |
                       (df['Low'] > df['Open']) |
                       (df['Low'] > df['Close'])).any()
        if ohlc_invalid:
            issues.append("Invalid OHLC relationships")
        
        negative_volume = (df['Volume'] < 0).any()
        if negative_volume:
            issues.append("Negative volume detected")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues
        }