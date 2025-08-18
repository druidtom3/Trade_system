/**
 * MNQ Trading Chart System - Main Application
 */

let dataManager;
let chartManager;
let fvgRenderer;
let playbackControls;
let currentTimeframe = 'M15';
let currentDate = null;
let isInitialized = false;
let isReplayMode = false;

// Global storage for drawings that persist across timeframes
window.globalDrawings = {
    horizontalLines: [],  // Array of {price: number, color: string, width: number, id: string}
    rectangles: []        // Array of {id: string, time1: number, price1: number, time2: number, price2: number, color: string, fillColor: string}
};

// Application initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing MNQ Trading Chart System...');
    
    dataManager = new DataManager();
    chartManager = new ChartManagerPro('mainChart');
    playbackControls = new PlaybackControls();
    
    await initializeApp();
    setupEventListeners();
    setupPlaybackEventListeners();
    setupKeyboardShortcuts();
    startPerformanceMonitoring();
});

async function initializeApp() {
    try {
        showLoading(true, 'Checking system health...');
        
        const health = await dataManager.checkHealth();
        console.log('System health:', health);
        
        if (!health.data_loaded) {
            console.log('Loading market data...');
            await dataManager.waitForDataLoad((status) => {
                updateLoadingProgress(status);
            });
        }
        
        // Load timeframes first
        const timeframes = await dataManager.getTimeframes();
        console.log('Available timeframes:', timeframes);
        
        // Set initialized before loading data to avoid race condition
        isInitialized = true;
        console.log('🚀 System initialized, loading initial data...');
        
        // Load data but don't update chart yet (chart not initialized)
        console.log('📊 Fetching initial data for timeframe:', currentTimeframe);
        const initialData = await dataManager.getRandomData(currentTimeframe);
        console.log('✅ Initial data fetched:', {
            date: initialData.date,
            candles: initialData.data?.length,
            fvgs: initialData.fvgs?.length
        });
        
        // Update UI with initial data
        updateUI(initialData);
        currentDate = initialData.date;
        document.getElementById('dateSelector').value = initialData.date;
        
        // Initialize chart AFTER loading overlay is hidden
        showLoading(false);
        console.log('🎨 Initializing chart after hiding loading overlay...');
        chartManager.init();
        
        // Now update chart with the loaded data
        console.log('📈 Updating chart with initial data...');
        chartManager.updateData(initialData.data, initialData.fvgs);
        updateSystemStatus('Ready');
        console.log('✅ Initial data loaded successfully');
        
        // Initialize language system
        if (window.languageManager) {
            window.languageManager.updateUI();
        }
        
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('Failed to initialize application: ' + error.message);
        showLoading(false);
        updateSystemStatus('Error');
    }
}

function setupEventListeners() {
    // Timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tf = e.target.dataset.tf;
            if (tf) {
                setTimeframe(tf);
            }
        });
    });
    
    // Date navigation
    document.getElementById('prevDayBtn').addEventListener('click', async () => {
        await navigateDate(-1);
        updateDateSelectorFromCurrentDate();
    });
    document.getElementById('nextDayBtn').addEventListener('click', async () => {
        await navigateDate(1);
        updateDateSelectorFromCurrentDate();
    });
    document.getElementById('todayBtn').addEventListener('click', async () => {
        await loadToday();
        updateDateSelectorFromCurrentDate();
    });
    document.getElementById('randomBtn').addEventListener('click', async () => {
        await loadRandomData();
        updateDateSelectorFromCurrentDate();
    });
    
    // Load Data button - explicit loading
    document.getElementById('loadDataBtn').addEventListener('click', async () => {
        const selectedDate = document.getElementById('dateSelector').value;
        if (selectedDate) {
            try {
                await loadDataByDate(selectedDate);
                updateSystemStatus(`Loaded data for ${selectedDate}`);
            } catch (error) {
                console.log(`No data for selected date ${selectedDate}, loading random data instead`);
                updateSystemStatus(`No data for ${selectedDate}, loaded random data instead`);
                await loadRandomData();
            }
        } else {
            alert('Please select a date first');
        }
    });
    
    // Optional: Auto-load on date change (commented out for explicit user control)
    // document.getElementById('dateSelector').addEventListener('change', async (e) => {
    //     if (e.target.value) {
    //         try {
    //             await loadDataByDate(e.target.value);
    //         } catch (error) {
    //             console.log(`No data for selected date ${e.target.value}, loading random data instead`);
    //             await loadRandomData();
    //         }
    //     }
    // });
    
    // Chart controls
    document.getElementById('fitBtn').addEventListener('click', () => chartManager.fitContent());
    document.getElementById('zoomInBtn').addEventListener('click', () => chartManager.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => chartManager.zoomOut());
    document.getElementById('resetBtn').addEventListener('click', () => chartManager.resetView());
    
    // Indicators
    document.getElementById('fvgToggle').addEventListener('change', (e) => {
        chartManager.toggleFVG(e.target.checked);
    });
    
    document.getElementById('fvgMarkersToggle').addEventListener('change', (e) => {
        chartManager.toggleFVGMarkers(e.target.checked);
    });
    
    document.getElementById('clearedFVGToggle').addEventListener('change', (e) => {
        chartManager.toggleClearedFVGs(e.target.checked);
    });
    
    document.getElementById('volumeToggle').addEventListener('change', (e) => {
        chartManager.toggleVolume(e.target.checked);
    });
    
    
    // Drawing tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = e.currentTarget.dataset.tool;
            if (tool === 'clear') {
                chartManager.clearDrawings();
            } else {
                chartManager.setTool(tool);
            }
        });
    });
    
    // Collapsible sections
    document.querySelectorAll('.collapse-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.dataset.target;
            const content = document.getElementById(target);
            if (content) {
                content.classList.toggle('collapsed');
                e.target.textContent = content.classList.contains('collapsed') ? '+' : '−';
            }
        });
    });
    
    // Settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Theme selector
    document.getElementById('theme').addEventListener('change', (e) => {
        setTheme(e.target.value);
    });
    
    // Language selector
    document.getElementById('language').addEventListener('change', (e) => {
        if (window.languageManager) {
            window.languageManager.setLanguage(e.target.value);
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + R: Random date
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            loadRandomData();
        }
        
        // Ctrl/Cmd + F: Fit to screen
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            chartManager.fitContent();
        }
        
        // Arrow keys for date navigation
        if (e.key === 'ArrowLeft') {
            navigateDate(-1);
        } else if (e.key === 'ArrowRight') {
            navigateDate(1);
        }
        
        // Number keys for timeframes
        const tfMap = {
            '1': 'M1',
            '2': 'M5', 
            '3': 'M15',
            '4': 'H1',
            '5': 'H4',
            '6': 'D1'
        };
        
        if (tfMap[e.key]) {
            setTimeframe(tfMap[e.key]);
        }
    });
}

async function setTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tf="${timeframe}"]`)?.classList.add('active');
    
    if (currentDate) {
        try {
            await loadDataByDate(currentDate);
        } catch (error) {
            console.log(`No data for ${currentDate} in ${timeframe}, loading random data instead`);
            await loadRandomData();
        }
    } else {
        await loadRandomData();
    }
}

async function loadRandomData() {
    if (!isInitialized) return;
    
    try {
        updateSystemStatus('Loading random data...');
        showLoading(true, 'Loading market data...');
        
        console.log('📊 Fetching random data for timeframe:', currentTimeframe);
        const data = await dataManager.getRandomData(currentTimeframe);
        console.log('✅ Data fetched:', {
            date: data.date,
            candles: data.data?.length,
            fvgs: data.fvgs?.length
        });
        
        console.log('🔄 Updating UI');
        updateUI(data);
        console.log('📈 Updating chart manager');
        chartManager.updateData(data.data, data.fvgs);
        
        // FVGRenderer disabled - chart-manager handles FVG rendering
        // if (fvgRenderer) {
        //     fvgRenderer.render(data.fvgs);
        // }
        
        currentDate = data.date;
        document.getElementById('dateSelector').value = data.date;
        
        showLoading(false);
        updateSystemStatus('Ready');
        
    } catch (error) {
        console.error('Failed to load random data:', error);
        alert('Failed to load data: ' + error.message);
        showLoading(false);
        updateSystemStatus('Error');
    }
}

async function loadDataByDate(date) {
    if (!isInitialized) return;
    
    try {
        updateSystemStatus(`Loading data for ${date}...`);
        showLoading(true, `Loading ${date} data...`);
        
        const data = await dataManager.getDataByDate(date, currentTimeframe);
        
        updateUI(data);
        chartManager.updateData(data.data, data.fvgs);
        
        // FVGRenderer disabled - chart-manager handles FVG rendering
        // if (fvgRenderer) {
        //     fvgRenderer.render(data.fvgs);
        // }
        
        currentDate = date;
        document.getElementById('dateSelector').value = date;
        
        showLoading(false);
        updateSystemStatus('Ready');
        
    } catch (error) {
        console.error('Failed to load data by date:', error);
        showLoading(false);
        updateSystemStatus('No data available');
        throw error; // Re-throw to allow caller to handle
    }
}

async function loadToday() {
    const today = new Date().toISOString().split('T')[0];
    try {
        await loadDataByDate(today);
    } catch (error) {
        console.log(`No data for today ${today}, loading random data instead`);
        await loadRandomData();
    }
}

async function navigateDate(direction) {
    if (!currentDate) return;
    
    let date = new Date(currentDate);
    let attempts = 0;
    const maxAttempts = 10; // Try up to 10 days
    
    while (attempts < maxAttempts) {
        date.setDate(date.getDate() + direction);
        const newDate = date.toISOString().split('T')[0];
        
        try {
            await loadDataByDate(newDate);
            return; // Success, exit
        } catch (error) {
            attempts++;
            console.log(`No data for ${newDate}, trying next date...`);
        }
    }
    
    // If we couldn't find data in any direction, load random data
    console.log('Could not find data in navigation direction, loading random data');
    await loadRandomData();
}

function updateUI(data) {
    // Market info
    document.getElementById('marketDate').textContent = data.date || '-';
    
    const session = data.holiday_info?.is_holiday ? 'Closed' : 
                    data.holiday_info?.is_early_close ? 'Early Close' : 'Regular';
    document.getElementById('marketSession').textContent = session;
    
    if (data.ny_open_taipei) {
        const openTime = new Date(data.ny_open_taipei).toLocaleTimeString('zh-TW');
        document.getElementById('nyOpenTime').textContent = openTime;
    }
    
    if (data.ny_close_taipei) {
        const closeTime = new Date(data.ny_close_taipei).toLocaleTimeString('zh-TW');
        document.getElementById('nyCloseTime').textContent = closeTime;
    }
    
    document.getElementById('holidayStatus').textContent = 
        data.holiday_info?.is_holiday ? 'Yes' : 'No';
    
    document.getElementById('dstStatus').textContent = 
        data.is_dst ? 'Yes (EDT)' : 'No (EST)';
    
    // Update last update time
    const now = new Date().toLocaleTimeString('zh-TW');
    document.getElementById('lastUpdate').textContent = now;
    
    console.log('UI updated:', {
        date: data.date,
        candles: data.candle_count,
        fvgs: data.fvgs?.length || 0
    });
}

function showLoading(show, message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
        if (message) {
            const msgElement = document.getElementById('progressMessage');
            if (msgElement) msgElement.textContent = message;
        }
    }
}

function updateLoadingProgress(status) {
    if (!status) return;
    
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressMessage = document.getElementById('progressMessage');
    
    if (progressFill && status.percentage !== undefined) {
        progressFill.style.width = `${status.percentage}%`;
    }
    
    if (progressPercent && status.percentage !== undefined) {
        progressPercent.textContent = `${status.percentage}%`;
    }
    
    if (progressMessage && status.message) {
        progressMessage.textContent = status.message;
    }
}

function updateSystemStatus(status) {
    const element = document.getElementById('systemStatus');
    if (element) {
        element.textContent = status;
    }
}

function setTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    // Chart theme would be updated here
}

function saveSettings() {
    const settings = {
        candleLimit: document.getElementById('candleLimit').value,
        theme: document.getElementById('theme').value
    };
    
    localStorage.setItem('chartSettings', JSON.stringify(settings));
    alert('Settings saved!');
}

function loadSettings() {
    const saved = localStorage.getItem('chartSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        document.getElementById('candleLimit').value = settings.candleLimit || 400;
        document.getElementById('theme').value = settings.theme || 'dark';
        setTheme(settings.theme);
    }
}

function startPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    function updateMetrics() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
            const memory = performance.memory ? 
                `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB` : 'N/A';
            
            document.getElementById('performanceMetrics').textContent = 
                `FPS: ${fps} | Memory: ${memory}`;
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        requestAnimationFrame(updateMetrics);
    }
    
    requestAnimationFrame(updateMetrics);
}

// ============= UTILITY FUNCTIONS =============

function updateDateSelectorFromCurrentDate() {
    if (currentDate) {
        document.getElementById('dateSelector').value = currentDate;
    }
}

// ============= PLAYBACK CONTROLS =============

function setupPlaybackEventListeners() {
    // Play button
    document.getElementById('playBtn').addEventListener('click', async () => {
        try {
            if (!playbackControls.isPrepared) {
                // Need to prepare first - use current date from dateSelector
                let selectedDate = document.getElementById('dateSelector').value;
                if (!selectedDate) {
                    // If no date selected, use current date from loaded data or a random date
                    if (currentDate) {
                        selectedDate = currentDate;
                    } else {
                        // Load random data to get a date
                        await loadRandomData();
                        selectedDate = currentDate;
                    }
                    
                    // Update the date selector
                    updateDateSelectorFromCurrentDate();
                }
                
                const speed = parseFloat(document.getElementById('speedSelector').value);
                await playbackControls.prepareReplay(selectedDate, speed);
            }
            
            await playbackControls.startPlayback();
            updatePlaybackUI();
            
        } catch (error) {
            console.error('Failed to start playback:', error);
            alert('Failed to start playback: ' + error.message);
        }
    });
    
    // Pause button
    document.getElementById('pauseBtn').addEventListener('click', async () => {
        try {
            await playbackControls.pausePlayback();
            updatePlaybackUI();
        } catch (error) {
            console.error('Failed to pause playback:', error);
        }
    });
    
    // Stop button
    document.getElementById('stopBtn').addEventListener('click', async () => {
        try {
            await playbackControls.stopReplay();
            updatePlaybackUI();
            isReplayMode = false;
            
            // Switch back to M1 for normal view
            if (currentTimeframe !== 'M1') {
                await setTimeframe('M1');
            }
            
        } catch (error) {
            console.error('Failed to stop replay:', error);
        }
    });
    
    // Speed selector
    document.getElementById('speedSelector').addEventListener('change', async (e) => {
        try {
            const speed = parseFloat(e.target.value);
            if (playbackControls.isPrepared) {
                await playbackControls.changeSpeed(speed);
            }
        } catch (error) {
            console.error('Failed to change speed:', error);
        }
    });
    
    // Setup playback callbacks
    playbackControls.onCandleReceived = (candleData) => {
        handleReplayCandle(candleData);
    };
    
    playbackControls.onStatusChanged = (status) => {
        handleReplayStatusChange(status);
    };
}

function handleReplayCandle(candleData) {
    if (!chartManager || !isReplayMode) return;
    
    try {
        // Create chart-compatible candle data
        const chartCandle = {
            time: candleData.time,
            open: candleData.open,
            high: candleData.high,
            low: candleData.low,
            close: candleData.close,
            volume: candleData.volume
        };
        
        // Update the chart with new candle (for M1 only in Week 1)
        // In future weeks, we'll add multi-timeframe sync
        if (currentTimeframe === 'M1') {
            // For now, we'll replace the entire chart data
            // In a real implementation, we'd append to existing data
            console.log('📊 Updating chart with replay candle:', chartCandle);
            // TODO: Implement incremental candle update
        }
        
    } catch (error) {
        console.error('Error handling replay candle:', error);
    }
}

function handleReplayStatusChange(status) {
    console.log('📡 Replay status change:', status);
    
    switch (status.type) {
        case 'prepared':
            isReplayMode = true;
            // Switch to M1 timeframe for replay
            if (currentTimeframe !== 'M1') {
                setTimeframe('M1');
            }
            updatePlaybackUI();
            break;
            
        case 'playing':
            updatePlaybackUI();
            break;
            
        case 'paused':
            updatePlaybackUI();
            break;
            
        case 'stopped':
            isReplayMode = false;
            updatePlaybackUI();
            break;
            
        case 'finished':
            isReplayMode = false;
            updatePlaybackUI();
            alert('Replay finished!');
            break;
            
        case 'progress':
            updateReplayProgress(status.currentIndex, status.totalCandles, status.progress);
            break;
            
        case 'error':
            console.error('Replay error:', status.error);
            alert('Replay error: ' + status.error);
            break;
    }
}

function updatePlaybackUI() {
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const speedSelector = document.getElementById('speedSelector');
    
    if (playbackControls.isPlaying) {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
        stopBtn.disabled = false;
        speedSelector.disabled = false;
    } else if (playbackControls.isPrepared) {
        playBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        stopBtn.disabled = false;
        speedSelector.disabled = false;
    } else {
        playBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
        stopBtn.disabled = true;
        speedSelector.disabled = true;
    }
}

function updateReplayProgress(currentIndex, totalCandles, progressPercent) {
    const progressText = document.getElementById('replayProgress');
    const progressBar = document.getElementById('replayProgressBar');
    
    if (progressText) {
        progressText.textContent = `${currentIndex}/${totalCandles}`;
    }
    
    if (progressBar) {
        progressBar.style.width = `${progressPercent || 0}%`;
    }
}

// Load settings on startup
loadSettings();