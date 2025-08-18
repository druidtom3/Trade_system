# MNQ Trading Chart System - Professional Edition

Advanced Fair Value Gap (FVG) detection and visualization system for NASDAQ-100 Micro Futures (MNQ) trading analysis.

## 📁 Data Files Required

**⚠️ Important**: This repository contains only source code. You need to provide your own market data files.

Create a `data/` folder in the project root and add the following CSV files:
- `MNQ_M1_2019-2024.csv` - 1-minute timeframe data
- `MNQ_M5_2019-2024.csv` - 5-minute timeframe data  
- `MNQ_M15_2019-2024.csv` - 15-minute timeframe data
- `MNQ_H1_2019-2024.csv` - 1-hour timeframe data
- `MNQ_H4_2019-2024.csv` - 4-hour timeframe data
- `MNQ_D1_2019-2024.csv` - Daily timeframe data

### Expected CSV Format:
```
Date,Time,Open,High,Low,Close,Volume,Tick Count
2024-01-01,09:30:00,15000.00,15010.00,14990.00,15005.00,1000,150
```
*The system will automatically process these files and create necessary timestamp columns.*

## Overview
A web-based trading chart analysis system for MNQ (Micro E-mini Nasdaq-100) futures, featuring advanced Fair Value Gap (FVG) detection and visualization.

## ✨ Key Features

### FVG Detection & Visualization
- **Advanced FVG Detector V4** with corrected detection logic (C.Close comparison)
- **Semi-transparent fill effect** with adaptive density (4-130 lines based on gap size)
- **Time-limited display** (40 candles) with clean boundary lines (0.5 width)
- **Independent controls** for FVG boundaries, markers (F1, F2...), and cleared FVGs

### Professional Trading Interface
- **Multi-timeframe support** (M1, M5, M15, H1, H4, D1) with 400 candles display
- **Lightweight Charts v5** integration with custom styling
- **Real-time server status** page with loading progress
- **Clean white background** without grid lines for optimal viewing

### Data Processing
- **Time zone conversion** (UTC → EST/EDT → Taipei)
- **US market holidays** detection and handling
- **Performance-optimized** data processing with vectorized operations
- **Smart data management** with proper memory cleanup

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
http://localhost:5001
```
*The system will automatically show a status page while loading, then redirect to the main interface.*

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

---

## 📄 Source Code Files (RAW Links)

### 🐍 Backend Files
- **app.py** - Flask application server
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/app.py

- **data_processor.py** - Data loading and processing
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/data_processor.py

- **fvg_detector_v4.py** - Fair Value Gap detection algorithm
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/fvg_detector_v4.py

- **time_utils.py** - Time zone conversion utilities
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/time_utils.py

- **us_holidays.py** - US market holidays detection
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/us_holidays.py

- **candle_continuity_checker.py** - Data continuity validation
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/backend/candle_continuity_checker.py

### 🌐 Frontend Files
- **index.html** - Main application interface
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/index.html

- **app.js** - Application initialization and control
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/app.js

- **chart-manager-pro.js** - Professional chart management with FVG rendering
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/chart-manager-pro.js

- **data-manager.js** - Frontend data handling
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/data-manager.js

- **languages.js** - Multi-language support (EN/中文)
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/languages.js

- **style.css** - Main application styles
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/style.css

- **server-status.html** - Server loading status page
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/server-status.html

### 🔧 Legacy/Alternative Files
- **chart-manager.js** - Basic chart manager (legacy)
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/chart-manager.js

- **fvg-renderer.js** - Standalone FVG renderer (disabled)
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/fvg-renderer.js

- **index-simple.html** - Simplified interface
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/index-simple.html

- **script-v2.js** - Alternative main script
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/script-v2.js

- **style-v2.css** - Alternative styles
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/frontend/style-v2.css

### ⚙️ Configuration Files
- **config.py** - System configuration
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/utils/config.py

- **continuity_config.py** - Data continuity settings
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/src/utils/continuity_config.py

- **requirements.txt** - Python dependencies
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/requirements.txt

### 📚 Documentation
- **README.md** - This file
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/README.md

- **SYSTEM_REQUIREMENTS.md** - Technical specifications
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/SYSTEM_REQUIREMENTS.md

- **FVG_Implementation_Guide.md** - FVG implementation details
  https://raw.githubusercontent.com/druidtom3/Trade_system/master/misc/FVG_Implementation_Guide.md

### 🎯 Key Features Added
- **Drawing Tools**: Horizontal lines and rectangles with cross-timeframe persistence
- **Drawings Info Panel**: Detailed analysis of drawn objects (time range, price range, candle count, percentages)
- **Multi-language Support**: English/中文 with technical term preservation
- **Advanced FVG Detection**: Corrected logic with adaptive fill visualization
- **Professional UI**: Clean interface with real-time status monitoring

*All files are available as RAW downloads for direct integration into your development environment.*