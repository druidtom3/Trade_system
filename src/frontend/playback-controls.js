/**
 * PlaybackControls - K-line replay functionality
 * Provides play/pause/stop controls and EventSource streaming
 */

class PlaybackControls {
    constructor() {
        this.eventSource = null;
        this.isPlaying = false;
        this.isPrepared = false;
        this.currentDate = null;
        this.currentSpeed = 1.0;
        this.currentIndex = 0;
        this.totalCandles = 0;
        this.onCandleReceived = null;  // Callback for new candle data
        this.onStatusChanged = null;   // Callback for status changes
        this.onMultiTimeframeCandleReceived = null;  // Callback for multi-timeframe candle data
        
        this.setupUI();
        this.bindEvents();
        
        console.log('🎬 PlaybackControls initialized');
    }
    
    setupUI() {
        // This will be called by the main app to setup UI references
        // We don't create DOM elements here, just prepare for them
    }
    
    bindEvents() {
        // Event bindings will be set up when UI elements are available
    }
    
    async prepareReplay(date, speed = 1.0) {
        try {
            console.log(`📅 Preparing replay for ${date} at ${speed}s/candle`);
            
            // Stop any existing replay first
            await this.stopReplay();
            
            const response = await fetch('/api/replay/start', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: date,
                    speed: speed
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to prepare replay');
            }
            
            this.isPrepared = true;
            this.currentDate = date;
            this.currentSpeed = speed;
            this.totalCandles = result.total_candles;
            this.currentIndex = 0;
            
            console.log(`✅ Replay prepared: ${this.totalCandles} candles ready`);
            
            if (this.onStatusChanged) {
                this.onStatusChanged({
                    type: 'prepared',
                    date: date,
                    totalCandles: this.totalCandles,
                    speed: speed
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to prepare replay:', error);
            this.isPrepared = false;
            throw error;
        }
    }
    
    async startPlayback() {
        if (!this.isPrepared) {
            throw new Error('Replay not prepared. Call prepareReplay() first.');
        }
        
        try {
            console.log('▶️ Starting playback');
            
            // Start the playback on server
            const response = await fetch('/api/replay/play', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to start playback');
            }
            
            // Start the EventSource stream
            this.startEventStream();
            
            this.isPlaying = true;
            
            if (this.onStatusChanged) {
                this.onStatusChanged({
                    type: 'playing',
                    isPlaying: true
                });
            }
            
            console.log('✅ Playback started');
            
        } catch (error) {
            console.error('❌ Failed to start playback:', error);
            throw error;
        }
    }
    
    async pausePlayback() {
        try {
            console.log('⏸️ Pausing playback');
            
            const response = await fetch('/api/replay/pause', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to pause playback');
            }
            
            this.isPlaying = false;
            
            if (this.onStatusChanged) {
                this.onStatusChanged({
                    type: 'paused',
                    isPlaying: false,
                    currentIndex: this.currentIndex
                });
            }
            
            console.log('✅ Playback paused');
            
        } catch (error) {
            console.error('❌ Failed to pause playback:', error);
            throw error;
        }
    }
    
    async stopReplay() {
        try {
            console.log('⏹️ Stopping replay');
            
            // Close EventSource if exists
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            
            // Stop on server
            const response = await fetch('/api/replay/stop', {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                console.warn('Server stop request failed, but continuing cleanup');
            }
            
            // Reset state
            this.isPlaying = false;
            this.isPrepared = false;
            this.currentIndex = 0;
            this.totalCandles = 0;
            this.currentDate = null;
            
            if (this.onStatusChanged) {
                this.onStatusChanged({
                    type: 'stopped',
                    isPlaying: false
                });
            }
            
            console.log('✅ Replay stopped');
            
        } catch (error) {
            console.error('❌ Failed to stop replay:', error);
            // Continue with cleanup even if server request failed
            this.isPlaying = false;
            this.isPrepared = false;
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
        }
    }
    
    async changeSpeed(speed) {
        try {
            console.log(`⚡ Changing speed to ${speed}s/candle`);
            
            const response = await fetch('/api/replay/speed', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    speed: speed
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to change speed');
            }
            
            this.currentSpeed = speed;
            
            if (this.onStatusChanged) {
                this.onStatusChanged({
                    type: 'speed_changed',
                    speed: speed
                });
            }
            
            console.log(`✅ Speed changed to ${speed}s/candle`);
            
        } catch (error) {
            console.error('❌ Failed to change speed:', error);
            throw error;
        }
    }
    
    startEventStream() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        console.log('🌊 Starting EventSource stream');
        
        this.eventSource = new EventSource('/api/replay/stream');
        
        this.eventSource.onopen = (event) => {
            console.log('✅ EventSource connection opened');
        };
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleStreamData(data);
            } catch (error) {
                console.error('❌ Failed to parse stream data:', error);
            }
        };
        
        this.eventSource.onerror = (event) => {
            console.error('❌ EventSource error:', event);
            
            if (this.eventSource.readyState === EventSource.CLOSED) {
                console.log('📡 EventSource connection closed');
                
                if (this.onStatusChanged) {
                    this.onStatusChanged({
                        type: 'connection_lost'
                    });
                }
            }
        };
    }
    
    handleStreamData(data) {
        switch (data.type) {
            case 'candle':
                // Handle single timeframe candle (backward compatibility)
                this.currentIndex = data.index;
                
                // Call the candle callback if set
                if (this.onCandleReceived) {
                    this.onCandleReceived(data);
                }
                
                // Update progress
                if (this.onStatusChanged) {
                    this.onStatusChanged({
                        type: 'progress',
                        currentIndex: this.currentIndex,
                        totalCandles: this.totalCandles,
                        progress: data.progress || 0
                    });
                }
                break;
                
            case 'multi_timeframe_candle':
                // Handle multi-timeframe synchronized candles
                this.currentIndex = data.index;
                
                console.log(`📊 Multi-TF update: ${Object.keys(data.timeframes).join(', ')} @ ${new Date(data.timestamp * 1000).toLocaleTimeString()}`);
                
                // Call the multi-timeframe candle callback if set
                if (this.onMultiTimeframeCandleReceived) {
                    this.onMultiTimeframeCandleReceived(data);
                }
                
                // Also call individual candle callbacks for each timeframe
                if (this.onCandleReceived && data.timeframes) {
                    for (const [timeframe, candleData] of Object.entries(data.timeframes)) {
                        // Add timeframe information to candle data
                        const enhancedCandle = {
                            ...candleData,
                            type: 'candle',
                            multi_timeframe_source: true,
                            all_timeframes: data.timeframes
                        };
                        this.onCandleReceived(enhancedCandle);
                    }
                }
                
                // Update progress
                if (this.onStatusChanged) {
                    this.onStatusChanged({
                        type: 'progress',
                        currentIndex: this.currentIndex,
                        totalCandles: this.totalCandles,
                        progress: data.progress || 0,
                        multi_timeframe_data: data.timeframes,
                        loaded_timeframes: data.loaded_timeframes
                    });
                }
                break;
                
            case 'finished':
                console.log('🏁 Multi-timeframe replay finished');
                this.isPlaying = false;
                
                if (this.onStatusChanged) {
                    this.onStatusChanged({
                        type: 'finished'
                    });
                }
                break;
                
            case 'heartbeat':
                // Keep-alive message when paused
                break;
                
            case 'error':
                console.error('❌ Stream error:', data.error);
                if (this.onStatusChanged) {
                    this.onStatusChanged({
                        type: 'error',
                        error: data.error
                    });
                }
                break;
                
            default:
                console.log('📨 Unknown stream data type:', data.type);
        }
    }
    
    async getStatus() {
        try {
            const response = await fetch('/api/replay/status');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('❌ Failed to get replay status:', error);
        }
        return null;
    }
    
    // Utility methods
    getProgress() {
        return this.totalCandles > 0 ? (this.currentIndex / this.totalCandles) * 100 : 0;
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    destroy() {
        console.log('🧹 Destroying PlaybackControls');
        this.stopReplay();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaybackControls;
}