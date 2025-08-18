/**
 * Data Manager - Handles API communication and data caching
 */

class DataManager {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:5001';
        this.cache = new Map();
        this.currentData = null;
        this.currentFVGs = null;
        this.loadingCallbacks = [];
    }
    
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', error: error.message };
        }
    }
    
    async getLoadingStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/loading-status`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get loading status:', error);
            return null;
        }
    }
    
    async waitForDataLoad(progressCallback) {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(async () => {
                const status = await this.getLoadingStatus();
                
                if (status) {
                    if (progressCallback) {
                        progressCallback(status);
                    }
                    
                    if (status.status === 'completed') {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (status.status === 'error') {
                        clearInterval(checkInterval);
                        reject(new Error('Data loading failed'));
                    }
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Data loading timeout'));
            }, 60000);
        });
    }
    
    async getTimeframes() {
        try {
            const response = await fetch(`${this.baseUrl}/api/timeframes`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get timeframes:', error);
            return { timeframes: [], loaded: [] };
        }
    }
    
    async getRandomData(timeframe = 'M15') {
        try {
            const cacheKey = `random_${timeframe}_${Date.now()}`;
            
            const response = await fetch(`${this.baseUrl}/api/random-data?timeframe=${timeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.currentData = data.data;
            this.currentFVGs = data.fvgs;
            
            return data;
        } catch (error) {
            console.error('Failed to get random data:', error);
            throw error;
        }
    }
    
    async getDataByDate(date, timeframe = 'M15') {
        try {
            const cacheKey = `${date}_${timeframe}`;
            
            if (this.cache.has(cacheKey)) {
                const cachedData = this.cache.get(cacheKey);
                this.currentData = cachedData.data;
                this.currentFVGs = cachedData.fvgs;
                return cachedData;
            }
            
            const response = await fetch(`${this.baseUrl}/api/data/${date}/${timeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.cache.set(cacheKey, data);
            
            this.currentData = data.data;
            this.currentFVGs = data.fvgs;
            
            return data;
        } catch (error) {
            console.error('Failed to get data by date:', error);
            throw error;
        }
    }
    
    formatDateForAPI(date) {
        if (typeof date === 'string') {
            return date;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    getCurrentData() {
        return this.currentData;
    }
    
    getCurrentFVGs() {
        return this.currentFVGs;
    }
    
    getFVGStats() {
        if (!this.currentFVGs) {
            return { bullish: 0, bearish: 0, total: 0 };
        }
        
        const bullish = this.currentFVGs.filter(fvg => fvg.type === 'bullish').length;
        const bearish = this.currentFVGs.filter(fvg => fvg.type === 'bearish').length;
        
        return {
            bullish: bullish,
            bearish: bearish,
            total: bullish + bearish
        };
    }
    
    clearCache() {
        this.cache.clear();
    }
}