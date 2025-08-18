# Trading Chart System - MNQ Analysis

## Overview
A web-based trading chart analysis system for MNQ (Micro E-mini Nasdaq-100) futures, featuring Fair Value Gap (FVG) detection and visualization.

## Features
- Multi-timeframe support (M1, M5, M15, H1, H4, D1)
- FVG Detector V4 with vectorized operations
- Time zone conversion (UTC → EST/EDT → Taipei)
- US market holidays detection
- Performance-optimized data processing
- Real-time loading progress tracking

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure CSV data files are in the `data/` directory:
- MNQ_M1_2019-2024.csv
- MNQ_M5_2019-2024.csv
- MNQ_M15_2019-2024.csv
- MNQ_H1_2019-2024.csv
- MNQ_H4_2019-2024.csv
- MNQ_D1_2019-2024.csv

## Running the Application

1. Start the Flask backend:
```bash
python src/backend/app.py
```

2. Open your browser and navigate to:
```
http://127.0.0.1:5001/simple
```

## Usage

1. **Load Random Data**: Click "Random Date" to load data from a random trading day
2. **Select Specific Date**: Use the date picker and click "Load Data"
3. **Change Timeframe**: Select from M1, M5, M15, H1, H4, or D1
4. **Toggle FVG**: Use the checkbox in the left panel to show/hide Fair Value Gaps

## Chart Configuration

The chart uses Lightweight Charts v5 with the following color scheme:
- **Bullish Candles**: White body with black borders
- **Bearish Candles**: Black body with black borders
- **Bullish FVG**: Green transparent rectangles
- **Bearish FVG**: Red transparent rectangles

## API Endpoints

- `GET /api/health` - System health check
- `GET /api/loading-status` - Data loading progress
- `GET /api/random-data?timeframe=M15` - Random date data
- `GET /api/data/{date}/{timeframe}` - Specific date data
- `GET /api/timeframes` - Available timeframes

## Project Structure

```
Trade_system/
├── data/                      # CSV data files
├── src/
│   ├── backend/
│   │   ├── app.py            # Flask application
│   │   ├── data_processor.py # Data handling
│   │   ├── fvg_detector_v4.py # FVG detection
│   │   ├── time_utils.py     # Time zone conversion
│   │   ├── us_holidays.py    # Holiday detection
│   │   └── candle_continuity_checker.py
│   ├── frontend/
│   │   ├── index-simple.html # Main interface
│   │   ├── chart-manager.js  # Chart management
│   │   ├── data-manager.js   # Data handling
│   │   ├── script-v2.js      # Main logic
│   │   └── style-v2.css      # Styles
│   └── utils/
│       ├── config.py          # Configuration
│       └── continuity_config.py
├── requirements.txt
├── README.md
└── SYSTEM_REQUIREMENTS.md

```

## Performance

- Startup time: < 10 seconds
- Data loading: Optimized with vectorization
- Smart truncation: Keeps recent 200k records for large files
- Memory usage: < 150MB target

## Development

For detailed system requirements and technical specifications, see `SYSTEM_REQUIREMENTS.md`.

## License

Proprietary - All rights reserved