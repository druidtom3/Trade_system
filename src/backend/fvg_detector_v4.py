"""
FVG Detector V4 - Implements FVG Rules V3
Fair Value Gap detection algorithm with vectorized operations
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class FVGDetectorV4:
    def __init__(self, max_lookback=40):
        self.max_lookback = max_lookback
        
    def detect_fvgs(self, df):
        """
        Detect Fair Value Gaps using vectorized operations
        
        FVG Rules V3:
        - Bullish FVG: C.Close > C.Open AND C.Open > L.High AND L.High < R.Low
        - Bearish FVG: C.Close < C.Open AND C.Open < L.Low AND L.Low > R.High
        
        Where:
        - L = Left candle (index - 1)
        - C = Current candle (index)
        - R = Right candle (index + 1)
        """
        if len(df) < 3:
            return []
            
        fvgs = []
        
        open_prices = df['Open'].values
        high_prices = df['High'].values
        low_prices = df['Low'].values
        close_prices = df['Close'].values
        timestamps = df['timestamp'].values
        
        for i in range(1, len(df) - 1):
            left_idx = i - 1
            curr_idx = i
            right_idx = i + 1
            
            curr_close = close_prices[curr_idx]
            curr_open = open_prices[curr_idx]
            left_high = high_prices[left_idx]
            left_low = low_prices[left_idx]
            right_low = low_prices[right_idx]
            right_high = high_prices[right_idx]
            
            is_bullish_fvg = (
                curr_close > curr_open and
                curr_close > left_high and
                left_high < right_low
            )
            
            is_bearish_fvg = (
                curr_close < curr_open and
                curr_close < left_low and
                left_low > right_high
            )
            
            if is_bullish_fvg:
                # Calculate end time as L + 40 candles or end of data
                end_idx = min(left_idx + 40, len(df) - 1)
                
                fvg = {
                    'type': 'bullish',
                    'topPrice': float(right_low),      # 上邊界: R.Low
                    'bottomPrice': float(left_high),   # 下邊界: L.High  
                    'startTime': int(timestamps[left_idx]),  # 左邊界: L
                    'endTime': int(timestamps[end_idx]),     # 右邊界: L+40
                    'detectionIndex': curr_idx,
                    'status': 'valid'
                }
                
                # Check if cleared after creating the FVG
                cleared_index = self._check_fvg_cleared(
                    df, curr_idx, left_high, 'bullish'
                )
                
                if cleared_index is not None:
                    fvg['status'] = 'cleared'
                    fvg['clearedIndex'] = cleared_index
                
                fvgs.append(fvg)
                
            elif is_bearish_fvg:
                # Calculate end time as L + 40 candles or end of data
                end_idx = min(left_idx + 40, len(df) - 1)
                
                fvg = {
                    'type': 'bearish',
                    'topPrice': float(left_low),       # 上邊界: L.Low
                    'bottomPrice': float(right_high),  # 下邊界: R.High
                    'startTime': int(timestamps[left_idx]),  # 左邊界: L  
                    'endTime': int(timestamps[end_idx]),     # 右邊界: L+40
                    'detectionIndex': curr_idx,
                    'status': 'valid'
                }
                
                # Check if cleared after creating the FVG
                cleared_index = self._check_fvg_cleared(
                    df, curr_idx, left_low, 'bearish'
                )
                
                if cleared_index is not None:
                    fvg['status'] = 'cleared'
                    fvg['clearedIndex'] = cleared_index
                
                fvgs.append(fvg)
        
        valid_fvgs = [fvg for fvg in fvgs if fvg['status'] == 'valid']
        logger.info(f"Detected {len(fvgs)} total FVGs, {len(valid_fvgs)} valid")
        return fvgs
    
    def _check_fvg_cleared(self, df, start_idx, level_price, fvg_type):
        """
        Check if FVG has been cleared within max_lookback candles
        
        Clearing conditions:
        - Bullish FVG: Any candle Close < level_price (L.High)
        - Bearish FVG: Any candle Close > level_price (L.Low)
        """
        end_idx = min(start_idx + self.max_lookback + 1, len(df))
        
        close_prices = df['Close'].values[start_idx + 1:end_idx]
        
        if fvg_type == 'bullish':
            cleared_mask = close_prices < level_price
        else:
            cleared_mask = close_prices > level_price
            
        if np.any(cleared_mask):
            cleared_relative_idx = np.argmax(cleared_mask)
            return start_idx + 1 + cleared_relative_idx
            
        return None
    
    def detect_fvgs_vectorized(self, df):
        """
        Basic for-loop FVG detection - checking every single candle in the 400 displayed candles
        No vectorization to ensure no candles are skipped
        L=index-2, C=index-1, R=index (current candle confirms FVG)
        """
        if len(df) < 3:
            return []
            
        fvgs = []
        data_length = len(df)
        
        # Check every candle from index 2 onwards (need at least 3 candles: L, C, R)
        for i in range(2, data_length):
            left_idx = i - 2    # L position
            middle_idx = i - 1  # C position  
            current_idx = i     # R position (confirming candle)
            
            # Get candle data
            left_open = df.iloc[left_idx]['Open']
            left_high = df.iloc[left_idx]['High']
            left_low = df.iloc[left_idx]['Low']
            left_close = df.iloc[left_idx]['Close']
            
            middle_open = df.iloc[middle_idx]['Open']
            middle_high = df.iloc[middle_idx]['High']
            middle_low = df.iloc[middle_idx]['Low']
            middle_close = df.iloc[middle_idx]['Close']
            
            right_open = df.iloc[current_idx]['Open']
            right_high = df.iloc[current_idx]['High']
            right_low = df.iloc[current_idx]['Low']
            right_close = df.iloc[current_idx]['Close']
            
            # Check for Bullish FVG
            # 1. C.Close > C.Open (middle candle is bullish)
            # 2. C.Close > L.High (middle close > left high)  
            # 3. L.High < R.Low (gap between left high and right low)
            is_bullish_fvg = (
                middle_close > middle_open and
                middle_close > left_high and
                left_high < right_low
            )
            
            if is_bullish_fvg:
                # Calculate display end time (L + 40 candles)
                end_idx = min(left_idx + 40, data_length - 1)
                
                fvg = {
                    'type': 'bullish',
                    'topPrice': float(right_low),       # R.Low (upper boundary)
                    'bottomPrice': float(left_high),    # L.High (lower boundary)
                    'startTime': int(df.iloc[left_idx]['timestamp']),     # L timestamp
                    'endTime': int(df.iloc[end_idx]['timestamp']),        # L+40 timestamp
                    'detectionIndex': current_idx,      # Current confirming candle
                    'leftIndex': left_idx,
                    'middleIndex': middle_idx,
                    'status': 'valid'
                }
                
                # Check if cleared after detection
                cleared_idx = self._check_fvg_cleared(df, current_idx, left_high, 'bullish')
                if cleared_idx is not None:
                    fvg['status'] = 'cleared'
                    fvg['clearedIndex'] = cleared_idx
                
                fvgs.append(fvg)
                logger.debug(f"Bullish FVG detected at candle {current_idx}: L{left_high} < R{right_low}, gap={right_low-left_high}")
            
            # Check for Bearish FVG
            # 1. C.Close < C.Open (middle candle is bearish)
            # 2. C.Close < L.Low (middle close < left low)
            # 3. L.Low > R.High (gap between left low and right high)
            is_bearish_fvg = (
                middle_close < middle_open and
                middle_close < left_low and
                left_low > right_high
            )
            
            if is_bearish_fvg:
                # Calculate display end time (L + 40 candles)
                end_idx = min(left_idx + 40, data_length - 1)
                
                fvg = {
                    'type': 'bearish',
                    'topPrice': float(left_low),        # L.Low (upper boundary)
                    'bottomPrice': float(right_high),   # R.High (lower boundary)
                    'startTime': int(df.iloc[left_idx]['timestamp']),     # L timestamp
                    'endTime': int(df.iloc[end_idx]['timestamp']),        # L+40 timestamp
                    'detectionIndex': current_idx,      # Current confirming candle
                    'leftIndex': left_idx,
                    'middleIndex': middle_idx,
                    'status': 'valid'
                }
                
                # Check if cleared after detection
                cleared_idx = self._check_fvg_cleared(df, current_idx, left_low, 'bearish')
                if cleared_idx is not None:
                    fvg['status'] = 'cleared'
                    fvg['clearedIndex'] = cleared_idx
                
                fvgs.append(fvg)
                logger.debug(f"Bearish FVG detected at candle {current_idx}: L{left_low} > R{right_high}, gap={left_low-right_high}")
        
        bullish_count = len([f for f in fvgs if f['type'] == 'bullish'])
        bearish_count = len([f for f in fvgs if f['type'] == 'bearish'])
        logger.info(f"FOR-LOOP: Checked {data_length-2} candles, detected {len(fvgs)} total FVGs: {bullish_count} bullish, {bearish_count} bearish")
        
        return fvgs