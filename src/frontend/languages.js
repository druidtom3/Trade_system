/**
 * Multi-language support for MNQ Trading Chart System
 * Preserves technical terms like FVG, API endpoints, etc.
 */

const languages = {
    'en': {
        // Header
        'app_title': 'MNQ Trading Analysis System',
        'version_badge': 'FVG Detector V4 | Professional',
        'connection_status': 'Connected',
        
        // Market Info
        'market_info': 'Market Info',
        'date': 'Date',
        'session': 'Session',
        'ny_open': 'NY Open (TPE)',
        'ny_close': 'NY Close (TPE)',
        'holiday': 'Holiday',
        'dst_active': 'DST Active',
        'regular': 'Regular',
        'closed': 'Closed',
        'early_close': 'Early Close',
        'yes': 'Yes',
        'no': 'No',
        
        // Indicators
        'indicators': 'Indicators',
        'fair_value_gaps': 'Fair Value Gaps',
        'fvg_markers': 'FVG Markers',
        'show_cleared_fvgs': 'Show Cleared FVGs',
        'volume': 'Volume',
        'valid_fvgs': 'Valid FVGs',
        'cleared_fvgs': 'Cleared FVGs',
        
        // Drawing Tools
        'drawing_tools': 'Drawing Tools',
        'trend_line': 'Trend Line',
        'horizontal_line': 'Horizontal Line',
        'rectangle': 'Rectangle',
        'text': 'Text',
        'cursor': 'Cursor',
        'clear_all': 'Clear All',
        'not_implemented': 'Not Implemented',
        
        // Drawings Info
        'drawings_info': 'Drawings Info',
        'horizontal_lines': 'Horizontal Lines',
        'rectangles': 'Rectangles',
        'no_drawings': 'No drawings yet',
        'price': 'Price',
        'time_range': 'Time Range',
        'price_range': 'Price Range',
        'height': 'Height',
        'candles': 'Candles',
        'duration': 'Duration',
        'bars': 'bars',
        'remove': 'Remove',
        'zoom': 'Zoom',
        
        // FVG Details
        'fvg_details': 'FVG Details',
        'bullish': 'BULLISH',
        'bearish': 'BEARISH',
        'valid': 'Valid',
        'cleared': 'Cleared',
        
        // Chart Controls
        'timeframes': 'Timeframes',
        'date_navigation': 'Date Navigation',
        'previous_day': 'Previous Day',
        'next_day': 'Next Day',
        'today': 'Today',
        'random_date': 'Random Date',
        'load_data': 'Load Data',
        'chart_controls': 'Chart Controls',
        'fit_screen': 'Fit Screen',
        'zoom_in': 'Zoom In',
        'zoom_out': 'Zoom Out',
        'reset_view': 'Reset View',
        
        // Info Bar
        'candles_count': 'Candles',
        'open': 'Open',
        'high': 'High',
        'low': 'Low',
        'close': 'Close',
        'range': 'Range',
        'volume_total': 'Volume',
        'last_update': 'Last Update',
        
        // Settings
        'settings': 'Settings',
        'candle_limit': 'Candle Limit',
        'theme': 'Theme',
        'dark_theme': 'Dark',
        'light_theme': 'Light',
        'language': 'Language',
        'english': 'English',
        'chinese': '中文',
        'save_settings': 'Save Settings',
        
        // Status Bar
        'system_status': 'Ready',
        'performance_metrics': 'Performance',
        'mouse_position': 'Price: - | Time: -',
        
        // Messages
        'loading': 'Loading...',
        'error': 'Error',
        'success': 'Success',
        'settings_saved': 'Settings saved!',
        'all_drawings_cleared': 'All drawings cleared',
        'horizontal_line_added': 'Horizontal line added',
        'rectangle_added': 'Rectangle added',
    },
    
    'zh': {
        // Header
        'app_title': 'MNQ 交易分析系統',
        'version_badge': 'FVG 檢測器 V4 | 專業版',
        'connection_status': '已連接',
        
        // Market Info
        'market_info': '市場資訊',
        'date': '日期',
        'session': '交易時段',
        'ny_open': '紐約開盤 (台北時間)',
        'ny_close': '紐約收盤 (台北時間)',
        'holiday': '假日',
        'dst_active': '夏令時間',
        'regular': '正常',
        'closed': '休市',
        'early_close': '提早收盤',
        'yes': '是',
        'no': '否',
        
        // Indicators
        'indicators': '指標',
        'fair_value_gaps': 'Fair Value Gaps',
        'fvg_markers': 'FVG 標記',
        'show_cleared_fvgs': '顯示已清除 FVG',
        'volume': '成交量',
        'valid_fvgs': '有效 FVG',
        'cleared_fvgs': '已清除 FVG',
        
        // Drawing Tools
        'drawing_tools': '繪圖工具',
        'trend_line': '趨勢線',
        'horizontal_line': '水平線',
        'rectangle': '矩形',
        'text': '文字',
        'cursor': '游標',
        'clear_all': '全部清除',
        'not_implemented': '尚未實作',
        
        // Drawings Info
        'drawings_info': '繪圖資訊',
        'horizontal_lines': '水平線',
        'rectangles': '矩形',
        'no_drawings': '尚無繪圖',
        'price': '價格',
        'time_range': '時間範圍',
        'price_range': '價格範圍',
        'height': '高度',
        'candles': 'K線',
        'duration': '持續時間',
        'bars': '根',
        'remove': '移除',
        'zoom': '縮放',
        
        // FVG Details
        'fvg_details': 'FVG 詳情',
        'bullish': '看漲',
        'bearish': '看跌',
        'valid': '有效',
        'cleared': '已清除',
        
        // Chart Controls
        'timeframes': '時間週期',
        'date_navigation': '日期導航',
        'previous_day': '前一天',
        'next_day': '後一天',
        'today': '今天',
        'random_date': '隨機日期',
        'load_data': '載入資料',
        'chart_controls': '圖表控制',
        'fit_screen': '適應螢幕',
        'zoom_in': '放大',
        'zoom_out': '縮小',
        'reset_view': '重設視圖',
        
        // Info Bar
        'candles_count': 'K線數',
        'open': '開盤',
        'high': '最高',
        'low': '最低',
        'close': '收盤',
        'range': '振幅',
        'volume_total': '成交量',
        'last_update': '最後更新',
        
        // Settings
        'settings': '設定',
        'candle_limit': 'K線限制',
        'theme': '主題',
        'dark_theme': '暗色',
        'light_theme': '亮色',
        'language': '語言',
        'english': 'English',
        'chinese': '中文',
        'save_settings': '儲存設定',
        
        // Status Bar
        'system_status': '就緒',
        'performance_metrics': '效能',
        'mouse_position': '價格: - | 時間: -',
        
        // Messages
        'loading': '載入中...',
        'error': '錯誤',
        'success': '成功',
        'settings_saved': '設定已儲存！',
        'all_drawings_cleared': '所有繪圖已清除',
        'horizontal_line_added': '水平線已添加',
        'rectangle_added': '矩形已添加',
    }
};

// Language manager
class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('app_language') || 'en';
        this.translations = languages[this.currentLanguage] || languages['en'];
    }
    
    setLanguage(lang) {
        if (languages[lang]) {
            this.currentLanguage = lang;
            this.translations = languages[lang];
            localStorage.setItem('app_language', lang);
            this.updateUI();
        }
    }
    
    t(key) {
        return this.translations[key] || key;
    }
    
    updateUI() {
        // Update all translatable elements
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translation;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.hasAttribute('title')) {
                element.title = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update language selector
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
        }
        
        console.log(`Language switched to: ${this.currentLanguage}`);
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Global language manager instance
window.languageManager = new LanguageManager();