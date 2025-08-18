"""
Time zone conversion utilities for the trading chart system
"""

import pytz
from datetime import datetime, timedelta, time
import pandas as pd
import numpy as np

class TimeZoneConverter:
    def __init__(self):
        self.utc_tz = pytz.UTC
        self.taipei_tz = pytz.timezone('Asia/Taipei')
        self.ny_tz = pytz.timezone('America/New_York')
        
    def is_dst(self, dt):
        """Check if given datetime is in DST for New York"""
        if isinstance(dt, pd.Timestamp):
            dt = dt.to_pydatetime()
        ny_time = self.ny_tz.normalize(self.ny_tz.localize(dt.replace(tzinfo=None)))
        return ny_time.dst() != timedelta(0)
    
    def convert_utc_to_ny(self, utc_timestamp):
        """Convert UTC timestamp to New York time"""
        if pd.isna(utc_timestamp):
            return None
        utc_time = datetime.fromtimestamp(utc_timestamp, tz=self.utc_tz)
        ny_time = utc_time.astimezone(self.ny_tz)
        return ny_time
    
    def convert_utc_to_taipei(self, utc_timestamp):
        """Convert UTC timestamp to Taipei time"""
        if pd.isna(utc_timestamp):
            return None
        utc_time = datetime.fromtimestamp(utc_timestamp, tz=self.utc_tz)
        taipei_time = utc_time.astimezone(self.taipei_tz)
        return taipei_time
    
    def get_market_hours_taipei(self, date):
        """Get market open and close times in Taipei timezone for given date"""
        if isinstance(date, str):
            date = pd.to_datetime(date).date()
        elif isinstance(date, pd.Timestamp):
            date = date.date()
            
        ny_open = self.ny_tz.localize(datetime.combine(date, time(9, 30)))
        ny_close = self.ny_tz.localize(datetime.combine(date, time(16, 0)))
        
        taipei_open = ny_open.astimezone(self.taipei_tz)
        taipei_close = ny_close.astimezone(self.taipei_tz)
        
        return {
            'open': taipei_open.strftime('%Y-%m-%d %H:%M:%S'),
            'close': taipei_close.strftime('%Y-%m-%d %H:%M:%S'),
            'is_dst': ny_open.dst() != timedelta(0)
        }
    
    def filter_market_hours(self, df, date):
        """Filter dataframe to only include market hours (9:30 AM - 4:00 PM EST)"""
        if df.empty:
            return df
            
        ny_times = df['timestamp'].apply(self.convert_utc_to_ny)
        
        mask = pd.Series([False] * len(df))
        for i, ny_time in enumerate(ny_times):
            if ny_time:
                market_time = ny_time.time()
                if time(9, 30) <= market_time <= time(16, 0):
                    mask.iloc[i] = True
                    
        return df[mask].reset_index(drop=True)
    
    def get_pre_market_window(self, df, date, minutes_before=5):
        """Get data for X minutes before market open"""
        if df.empty:
            return df
            
        market_hours = self.get_market_hours_taipei(date)
        
        if isinstance(date, str):
            date = pd.to_datetime(date).date()
            
        ny_open = self.ny_tz.localize(datetime.combine(date, time(9, 30)))
        ny_pre_open = ny_open - timedelta(minutes=minutes_before)
        
        pre_open_timestamp = ny_pre_open.timestamp()
        open_timestamp = ny_open.timestamp()
        
        mask = (df['timestamp'] >= pre_open_timestamp) & (df['timestamp'] < open_timestamp)
        
        return df[mask].reset_index(drop=True)