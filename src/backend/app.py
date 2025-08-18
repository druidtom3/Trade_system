"""
Flask application for trading chart system
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sys
from pathlib import Path
import logging
import threading
import time

sys.path.append(str(Path(__file__).parent.parent))

from data_processor import DataProcessor
from fvg_detector_v4 import FVGDetectorV4
from time_utils import TimeZoneConverter
from us_holidays import USMarketHolidays
from candle_continuity_checker import CandleContinuityChecker
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
        'server_ready': not is_loading and len(data_processor.loaded_data) > 0
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