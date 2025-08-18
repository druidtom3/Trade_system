/**
 * Main Application Logic
 */

let dataManager;
let chartManager;
let currentTimeframe = 'M15';
let isInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Trading Chart System...');
    
    dataManager = new DataManager();
    chartManager = new ChartManager('chart');
    
    await initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        showLoadingOverlay(true);
        updateLoadingProgress({ percentage: 0, message: 'Checking system health...' });
        
        const health = await dataManager.checkHealth();
        console.log('Health check:', health);
        
        if (!health.data_loaded) {
            console.log('Waiting for data to load...');
            await dataManager.waitForDataLoad((status) => {
                updateLoadingProgress(status);
            });
        }
        
        chartManager.init();
        
        const timeframes = await dataManager.getTimeframes();
        console.log('Available timeframes:', timeframes);
        
        await loadRandomData();
        
        isInitialized = true;
        showLoadingOverlay(false);
        
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('Failed to initialize application: ' + error.message);
        showLoadingOverlay(false);
    }
}

function setupEventListeners() {
    document.getElementById('loadDataBtn').addEventListener('click', loadDataByDate);
    
    document.getElementById('randomDateBtn').addEventListener('click', loadRandomData);
    
    document.getElementById('timeframeSelect').addEventListener('change', (e) => {
        currentTimeframe = e.target.value;
        if (document.getElementById('dateInput').value) {
            loadDataByDate();
        } else {
            loadRandomData();
        }
    });
    
    document.getElementById('fvgToggle').addEventListener('change', (e) => {
        chartManager.toggleFVG(e.target.checked);
    });
    
    document.getElementById('togglePanel').addEventListener('click', () => {
        const panel = document.getElementById('panelContent');
        const button = document.getElementById('togglePanel');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            button.textContent = '▼';
        } else {
            panel.style.display = 'none';
            button.textContent = '▶';
        }
    });
    
    document.getElementById('dateInput').addEventListener('change', (e) => {
        if (e.target.value) {
            loadDataByDate();
        }
    });
}

async function loadRandomData() {
    if (!isInitialized) return;
    
    try {
        showLoadingOverlay(true);
        updateLoadingProgress({ percentage: 50, message: 'Loading random date data...' });
        
        const data = await dataManager.getRandomData(currentTimeframe);
        
        updateUI(data);
        chartManager.updateData(data.data, data.fvgs);
        
        document.getElementById('dateInput').value = data.date;
        
        showLoadingOverlay(false);
        
    } catch (error) {
        console.error('Failed to load random data:', error);
        alert('Failed to load data: ' + error.message);
        showLoadingOverlay(false);
    }
}

async function loadDataByDate() {
    if (!isInitialized) return;
    
    const dateInput = document.getElementById('dateInput').value;
    if (!dateInput) {
        alert('Please select a date');
        return;
    }
    
    try {
        showLoadingOverlay(true);
        updateLoadingProgress({ percentage: 50, message: `Loading data for ${dateInput}...` });
        
        const data = await dataManager.getDataByDate(dateInput, currentTimeframe);
        
        updateUI(data);
        chartManager.updateData(data.data, data.fvgs);
        
        showLoadingOverlay(false);
        
    } catch (error) {
        console.error('Failed to load data by date:', error);
        alert('Failed to load data for selected date: ' + error.message);
        showLoadingOverlay(false);
    }
}

function updateUI(data) {
    document.getElementById('currentDate').textContent = data.date || '-';
    
    document.getElementById('candleCount').textContent = data.candle_count || 0;
    
    const nyOpenTime = data.ny_open_taipei ? 
        new Date(data.ny_open_taipei).toLocaleTimeString('zh-TW') : '-';
    document.getElementById('nyOpenTime').textContent = nyOpenTime;
    
    if (data.holiday_info) {
        let status = 'Normal Trading';
        if (data.holiday_info.is_holiday) {
            status = 'Market Closed';
        } else if (data.holiday_info.is_early_close) {
            status = 'Early Close (1 PM)';
        }
        document.getElementById('marketStatus').textContent = status;
    }
    
    document.getElementById('dstStatus').textContent = data.is_dst ? 'Yes (EDT)' : 'No (EST)';
    
    const fvgStats = dataManager.getFVGStats();
    document.getElementById('bullishCount').textContent = fvgStats.bullish;
    document.getElementById('bearishCount').textContent = fvgStats.bearish;
    
    console.log('UI updated with data:', {
        date: data.date,
        candles: data.candle_count,
        fvgs: fvgStats.total
    });
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function updateLoadingProgress(status) {
    if (!status) return;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (progressFill && status.percentage !== undefined) {
        progressFill.style.width = `${status.percentage}%`;
    }
    
    if (progressText && status.percentage !== undefined) {
        progressText.textContent = `${status.percentage}%`;
    }
    
    if (loadingMessage && status.message) {
        loadingMessage.textContent = status.message;
    }
}