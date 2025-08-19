"""
Flask application for trading chart system
"""

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import sys
from pathlib import Path
import logging
import threading
import time
import numpy as np
import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from data_processor import DataProcessor
from fvg_detector_v4 import FVGDetectorV4
from time_utils import TimeZoneConverter
from us_holidays import USMarketHolidays
from candle_continuity_checker import CandleContinuityChecker
from replay_server import ReplayServer
from utils.config import FLASK_CONFIG, TIMEFRAMES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../frontend')
CORS(app)

data_processor = DataProcessor()
fvg_detector = FVGDetectorV4()
tz_converter = TimeZoneConverter()
holiday_checker = USMarketHolidays()
continuity_checker = CandleContinuityChecker()
replay_server = ReplayServer(data_processor)

is_loading = False
loading_progress = {
    'percentage': 0,
    'message': 'Initializing...',
    'current_file': '',
    'completed_files': 0,
    'total_files': 6
}

def load_data_async():
    """Load data in background thread"""
    global is_loading, loading_progress
    is_loading = True
    loading_progress['message'] = 'Starting data load...'
    loading_progress['percentage'] = 0
    
    try:
        # Override data processor progress callback
        def progress_callback(file_name, completed, total):
            loading_progress['current_file'] = file_name
            loading_progress['completed_files'] = completed
            loading_progress['total_files'] = total
            loading_progress['percentage'] = int((completed / total) * 100)
            loading_progress['message'] = f'Loading {file_name}... ({completed}/{total})'
            logger.info(f"Progress: {loading_progress['percentage']}% - {loading_progress['message']}")
        
        data_processor.load_all_data(progress_callback)
        loading_progress['percentage'] = 100
        loading_progress['message'] = 'Data loading completed!'
        logger.info("All data loaded successfully")
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        loading_progress['percentage'] = 100
        loading_progress['message'] = f'Warning: {str(e)} - System running without data'
        loading_progress['message'] = f'Error: {str(e)}'
    finally:
        is_loading = False

@app.route('/')
def index():
    """Serve full professional version or status page if loading"""
    if is_loading or len(data_processor.loaded_data) == 0:
        return send_from_directory(app.static_folder, 'server-status.html')
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/status')
def status_page():
    """Serve server status page"""
    return send_from_directory(app.static_folder, 'server-status.html')

@app.route('/simple')
def simple():
    """Serve simple HTML interface"""
    return send_from_directory(app.static_folder, 'index-simple.html')

@app.route('/full')
def full():
    """Serve full professional version"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """System health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'data_loaded': len(data_processor.loaded_data) > 0
    })

@app.route('/api/loading-status', methods=['GET'])
def loading_status():
    """Get current loading status"""
    global loading_progress, is_loading
    
    # Get base status from data processor
    status = data_processor.get_loading_status() if hasattr(data_processor, 'get_loading_status') else {}
    
    # Add our enhanced progress information
    status.update({
        'is_loading': is_loading,
        'percentage': loading_progress['percentage'],
        'message': loading_progress['message'],
        'current_file': loading_progress['current_file'],
        'completed_files': loading_progress['completed_files'],
        'total_files': loading_progress['total_files'],
        'server_ready': not is_loading and len(data_processor.loaded_data) > 0,
        'data_loaded': len(data_processor.loaded_data) > 0
    })
    
    return jsonify(status)

@app.route('/api/timeframes', methods=['GET'])
def get_timeframes():
    """Get available timeframes"""
    return jsonify({
        'timeframes': TIMEFRAMES,
        'loaded': list(data_processor.loaded_data.keys())
    })

@app.route('/api/random-data', methods=['GET'])
def get_random_data():
    """Get data for random date"""
    timeframe = request.args.get('timeframe', 'M15')
    
    if not data_processor.loaded_data:
        return jsonify({'error': 'Data not loaded yet'}), 503
    
    df = data_processor.get_random_date_data(timeframe)
    
    if df is None or df.empty:
        return jsonify({'error': 'No data available'}), 404
    
    chart_data = data_processor.prepare_chart_data(df)
    
    fvgs = fvg_detector.detect_fvgs_vectorized(df)
    
    date = df.iloc[0]['Date']
    market_hours = tz_converter.get_market_hours_taipei(date)
    holiday_info = holiday_checker.get_holiday_info(date)
    
    response = {
        'date': date,
        'timeframe': timeframe,
        'data': chart_data,
        'fvgs': fvgs,
        'candle_count': len(chart_data),
        'ny_open_taipei': market_hours['open'],
        'ny_close_taipei': market_hours['close'],
        'is_dst': market_hours['is_dst'],
        'holiday_info': holiday_info
    }
    
    return jsonify(data_processor._convert_to_json_serializable(response))

@app.route('/api/common-random-date', methods=['GET'])
def get_common_random_date():
    """Get a random date that has data in all timeframes"""
    try:
        if not data_processor.loaded_data:
            return jsonify({'error': 'Data not loaded yet'}), 503
            
        # Get a date that exists in all timeframes
        common_date = data_processor.get_common_random_date()
        
        if not common_date:
            return jsonify({'error': 'No common dates found across timeframes'}), 404
            
        return jsonify({
            'date': common_date,
            'message': f'Common date available across all timeframes: {common_date}'
        })
        
    except Exception as e:
        logger.error(f"Error getting common random date: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/common-random-data', methods=['GET'])
def get_common_random_data():
    """Get data for random date that exists in all timeframes"""
    timeframe = request.args.get('timeframe', 'M15')
    date = request.args.get('date')  # Optional: use specific date
    
    try:
        if not data_processor.loaded_data:
            return jsonify({'error': 'Data not loaded yet'}), 503
            
        # If no date specified, get a random common date
        if not date:
            common_date = data_processor.get_common_random_date()
            
            if not common_date:
                return jsonify({'error': 'No common dates found across timeframes'}), 404
        else:
            common_date = date
            
        # Get data for this date in the requested timeframe
        df = data_processor.get_data_for_date(common_date, timeframe)
        
        if df is None or df.empty:
            return jsonify({'error': f'No data available for {common_date} in {timeframe}'}), 404
        
        chart_data = data_processor.prepare_chart_data(df)
        fvgs = fvg_detector.detect_fvgs_vectorized(df)
        
        market_hours = tz_converter.get_market_hours_taipei(common_date)
        holiday_info = holiday_checker.get_holiday_info(common_date)
        
        response = {
            'date': common_date,
            'timeframe': timeframe,
            'data': chart_data,
            'fvgs': fvgs,
            'candle_count': len(chart_data),
            'ny_open_taipei': market_hours['open'],
            'ny_close_taipei': market_hours['close'],
            'is_dst': market_hours['is_dst'],
            'holiday_info': holiday_info,
            'is_common_date': True
        }
        
        return jsonify(data_processor._convert_to_json_serializable(response))
        
    except Exception as e:
        logger.error(f"Error getting common random data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/m1-random-date', methods=['GET'])
def get_m1_random_date():
    """Get a random date that exists in M1 AND other timeframes to ensure data continuity"""
    try:
        if 'M1' not in data_processor.loaded_data:
            return jsonify({'error': 'M1 data not loaded'}), 400
            
        # Use the common random date logic to ensure consistency across timeframes
        common_date = data_processor.get_common_random_date()
        
        df = data_processor.loaded_data['M1']
        
        if not common_date:
            # Fallback to M1-only dates if no common dates found
            logger.warning("No common dates found, falling back to M1-only random date")
            df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
            unique_dates = df['date'].unique()
            random_date = np.random.choice(unique_dates)
            date_str = random_date.strftime('%Y-%m-%d')
            selected_date = random_date
        else:
            date_str = common_date
            # Convert string back to date for filtering
            selected_date = pd.to_datetime(common_date).date()
        
        # Get basic info about this date
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        date_data = df[df['date'] == selected_date]
        candle_count = len(date_data)
        
        # Get min/max timestamps for this date
        min_time = pd.to_datetime(date_data['timestamp'].min(), unit='s')
        max_time = pd.to_datetime(date_data['timestamp'].max(), unit='s')
        
        return jsonify({
            'date': date_str,
            'candle_count': candle_count,
            'start_time': min_time.strftime('%H:%M:%S'),
            'end_time': max_time.strftime('%H:%M:%S'),
            'message': f'Random M1 date with {candle_count} candles'
        })
        
    except Exception as e:
        logger.error(f"Error getting M1 random date: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/m1-date-range', methods=['GET'])
def get_m1_date_range():
    """Get the available date range for M1 data"""
    try:
        if 'M1' not in data_processor.loaded_data:
            return jsonify({'error': 'M1 data not loaded'}), 400
            
        df = data_processor.loaded_data['M1']
        
        # Get min and max dates
        min_timestamp = df['timestamp'].min()
        max_timestamp = df['timestamp'].max()
        
        min_date = pd.to_datetime(min_timestamp, unit='s').date()
        max_date = pd.to_datetime(max_timestamp, unit='s').date()
        
        # Count unique dates
        df['date'] = pd.to_datetime(df['timestamp'], unit='s').dt.date
        unique_dates = df['date'].nunique()
        total_candles = len(df)
        
        return jsonify({
            'min_date': min_date.strftime('%Y-%m-%d'),
            'max_date': max_date.strftime('%Y-%m-%d'),
            'total_days': unique_dates,
            'total_candles': total_candles,
            'message': f'M1 data available from {min_date} to {max_date} ({unique_dates} days, {total_candles} candles)'
        })
        
    except Exception as e:
        logger.error(f"Error getting M1 date range: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/<path:date>/<timeframe>', methods=['GET'])
def get_data_by_date(date, timeframe):
    """Get data for specific date and timeframe"""
    if not data_processor.loaded_data:
        return jsonify({'error': 'Data not loaded yet'}), 503
    
    df = data_processor.get_data_for_date(date, timeframe)
    
    if df is None or df.empty:
        return jsonify({'error': 'No data available for this date'}), 404
    
    chart_data = data_processor.prepare_chart_data(df)
    
    fvgs = fvg_detector.detect_fvgs_vectorized(df)
    
    market_hours = tz_converter.get_market_hours_taipei(date)
    holiday_info = holiday_checker.get_holiday_info(date)
    
    continuity = continuity_checker.check_continuity(df, timeframe)
    
    response = {
        'date': date,
        'timeframe': timeframe,
        'data': chart_data,
        'fvgs': fvgs,
        'candle_count': len(chart_data),
        'ny_open_taipei': market_hours['open'],
        'ny_close_taipei': market_hours['close'],
        'is_dst': market_hours['is_dst'],
        'holiday_info': holiday_info,
        'continuity': continuity
    }
    
    return jsonify(data_processor._convert_to_json_serializable(response))

@app.route('/api/debug/fvg-analysis', methods=['GET'])
def debug_fvg_analysis():
    """Debug endpoint to analyze FVG detection across timeframes"""
    results = {}
    
    for timeframe in ['M1', 'M5', 'M15', 'H1', 'H4', 'D1']:
        try:
            df = data_processor.get_random_date_data(timeframe)
            if df is not None and not df.empty:
                # Check if timestamp column exists
                has_timestamp = 'timestamp' in df.columns
                fvgs = fvg_detector.detect_fvgs_vectorized(df) if has_timestamp else []
                
                sample_candles = []
                if len(df) >= 3:
                    sample_df = df.head(3)[['DateTime', 'Open', 'High', 'Low', 'Close']]
                    sample_candles = sample_df.astype(str).to_dict('records')
                
                results[timeframe] = {
                    'data_rows': len(df),
                    'has_timestamp': has_timestamp,
                    'columns': list(df.columns),
                    'fvg_count': len(fvgs),
                    'sample_candles': sample_candles,
                    'first_fvg': data_processor._convert_to_json_serializable(fvgs[0]) if fvgs else None
                }
            else:
                results[timeframe] = {'error': 'No data available'}
        except Exception as e:
            results[timeframe] = {'error': str(e)}
    
    return jsonify(results)

# ============= REPLAY API ENDPOINTS =============

@app.route('/api/replay/start', methods=['PUT'])
def start_replay():
    """Start K-line replay for specific date"""
    try:
        data = request.get_json()
        date = data.get('date')
        speed = float(data.get('speed', 1.0))
        
        if not date:
            return jsonify({'error': 'Date is required'}), 400
            
        if speed not in [0.5, 1.0, 2.0, 3.0, 5.0, 10.0]:
            return jsonify({'error': 'Speed must be 0.5, 1, 2, 3, 5, or 10 seconds per candle'}), 400
            
        result = replay_server.start_replay(date, speed)
        
        if result['status'] == 'error':
            return jsonify(result), 400
        else:
            return jsonify(result)
            
    except Exception as e:
        logger.error(f"Error starting replay: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/play', methods=['POST'])
def play_replay():
    """Start/resume playback"""
    try:
        result = replay_server.play_replay()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error playing replay: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/pause', methods=['POST'])
def pause_replay():
    """Pause playback"""
    try:
        result = replay_server.pause_replay()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error pausing replay: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/stop', methods=['DELETE'])
def stop_replay():
    """Stop and reset playback"""
    try:
        result = replay_server.stop_replay()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error stopping replay: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/speed', methods=['PUT'])
def set_replay_speed():
    """Change playback speed"""
    try:
        data = request.get_json()
        speed = float(data.get('speed', 1.0))
        
        if speed not in [0.5, 1.0, 2.0, 3.0, 5.0, 10.0]:
            return jsonify({'error': 'Speed must be 0.5, 1, 2, 3, 5, or 10 seconds per candle'}), 400
            
        result = replay_server.set_speed(speed)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error setting replay speed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/status', methods=['GET'])
def get_replay_status():
    """Get current replay status"""
    try:
        status = replay_server.get_status()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting replay status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/seek', methods=['PUT'])
def seek_replay():
    """Seek to specific candle index"""
    try:
        data = request.get_json()
        index = int(data.get('index', 0))
        
        result = replay_server.seek_to_index(index)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error seeking replay: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/replay/stream')
def replay_stream():
    """Server-Sent Events stream for real-time candle data"""
    try:
        def add_cors_headers():
            response = Response(
                replay_server.candle_stream_generator(),
                mimetype='text/event-stream'
            )
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Cache-Control', 'no-cache')
            response.headers.add('Connection', 'keep-alive')
            return response
            
        return add_cors_headers()
        
    except Exception as e:
        logger.error(f"Error in replay stream: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/<path:filename>')
def serve_static_files(filename):
    """Serve static CSS and JS files"""
    if filename.endswith(('.css', '.js', '.html')):
        return send_from_directory(app.static_folder, filename)
    return "Not Found", 404

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    logger.info(f"Loading data from {data_processor.data_dir}")
    
    load_thread = threading.Thread(target=load_data_async)
    load_thread.start()
    
    app.run(
        host=FLASK_CONFIG['HOST'],
        port=FLASK_CONFIG['PORT'],
        debug=FLASK_CONFIG['DEBUG'],
        threaded=FLASK_CONFIG['THREADED']
    )