"""
Configuration file for the trading chart system
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

FLASK_CONFIG = {
    "HOST": "127.0.0.1",
    "PORT": 5001,
    "DEBUG": True,
    "THREADED": True
}

TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"]

DEFAULT_CANDLE_COUNT = 400
MAX_CANDLE_COUNT = 2000

CHART_COLORS = {
    "upColor": "#FFFFFF",
    "downColor": "#000000",
    "borderUpColor": "#000000",
    "borderDownColor": "#000000", 
    "wickUpColor": "#000000",
    "wickDownColor": "#000000"
}

FVG_CONFIG = {
    "max_lookback": 40,
    "bullish_color": "rgba(0, 255, 0, 0.2)",
    "bearish_color": "rgba(255, 0, 0, 0.2)"
}

MARKET_HOURS = {
    "open": "09:30",
    "close": "16:00",
    "timezone": "America/New_York"
}

LOADING_CONFIG = {
    "batch_size": 10000,
    "max_file_rows": 200000,
    "use_vectorization": True,
    "enable_caching": True
}