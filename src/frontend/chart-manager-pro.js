/**
 * Professional Chart Manager with Advanced Features
 */

class ChartManagerPro {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.fvgPrimitives = [];
        this.drawings = [];
        this.currentData = null;
        this.currentFVGs = null;
        this.settings = {
            showFVG: true,
            showFVGMarkers: false,
            showClearedFVGs: false,
            showVolume: false,
            theme: 'dark'
        };
        this.selectedTool = 'cursor';
        this.isDrawing = false;
        this.drawingStart = null;
    }
    
    init() {
        console.log('🔧 Initializing ChartManagerPro for container:', this.containerId);
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Container ${this.containerId} not found`);
            return;
        }
        console.log('📦 Container found:', container.offsetWidth, 'x', container.offsetHeight);
        
        // Check if container has proper dimensions
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            console.warn('⚠️  Container has zero dimensions:', {
                width: container.offsetWidth,
                height: container.offsetHeight,
                display: getComputedStyle(container).display,
                visibility: getComputedStyle(container).visibility
            });
        }
        
        const chartOptions = {
            width: container.offsetWidth,
            height: container.offsetHeight,
            layout: {
                background: {
                    type: 'solid',
                    color: '#ffffff'
                },
                textColor: '#333333',
            },
            grid: {
                vertLines: {
                    visible: false,
                },
                horzLines: {
                    visible: false,
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: 'rgba(100, 100, 100, 0.5)',
                    style: 0,
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(100, 100, 100, 0.5)',
                    style: 0,
                },
            },
            rightPriceScale: {
                borderColor: '#cccccc',
                visible: true,
                autoScale: true,
            },
            timeScale: {
                borderColor: '#cccccc',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 8,
            },
        };
        
        console.log('🎨 Creating LightweightChart with options');
        this.chart = LightweightCharts.createChart(container, chartOptions);
        console.log('✅ Chart created successfully');
        
        console.log('📈 Adding candlestick series');
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#FFFFFF',
            downColor: '#000000',
            borderUpColor: '#000000',
            borderDownColor: '#000000',
            wickUpColor: '#000000',
            wickDownColor: '#000000',
            borderVisible: true,
            wickVisible: true,
        });
        console.log('✅ Candlestick series added successfully');
        
        console.log('🎮 Setting up event handlers');
        this.setupEventHandlers();
        console.log('🔄 Setting up crosshair sync');
        this.setupCrosshairSync();
        
        console.log('📱 Adding resize listener');
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('✅ Professional Chart Manager initialized successfully');
    }
    
    setupEventHandlers() {
        if (!this.chart) return;
        
        this.chart.subscribeCrosshairMove((param) => {
            if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
                this.updateMousePosition(null, null);
            } else {
                const price = this.candlestickSeries.coordinateToPrice(param.point.y);
                this.updateMousePosition(price, param.time);
            }
        });
        
        this.chart.subscribeClick((param) => {
            if (this.selectedTool !== 'cursor') {
                this.handleDrawingClick(param);
            }
        });
    }
    
    setupCrosshairSync() {
        this.chart.subscribeCrosshairMove((param) => {
            if (!param.time) {
                // Clear cursor info when not over candle
                this.updateMousePosition(null, null);
                this.updateCandleInfo(null);
                return;
            }
            
            const data = param.seriesData.get(this.candlestickSeries);
            if (data) {
                // Update both cursor position and candle info
                this.updateMousePosition(data.close, param.time);
                this.updateCandleInfo(data, param.time);
            }
        });
    }
    
    updateMousePosition(price, time) {
        const element = document.getElementById('mousePosition');
        if (element) {
            if (price !== null && time !== null) {
                const formattedPrice = price.toFixed(2);
                const date = new Date(time * 1000);
                const formattedTime = date.toLocaleString('zh-TW');
                element.textContent = `Price: ${formattedPrice} | Time: ${formattedTime}`;
            } else {
                element.textContent = 'Price: - | Time: -';
            }
        }
    }
    
    updateCandleInfo(candle, time) {
        const open = document.getElementById('candleOpen');
        const high = document.getElementById('dayHigh');
        const low = document.getElementById('dayLow');
        const close = document.getElementById('candleClose');
        const range = document.getElementById('priceRange');
        
        if (!candle) {
            // Clear all values when no candle
            if (open) open.textContent = '-';
            if (high) high.textContent = '-';
            if (low) low.textContent = '-';
            if (close) close.textContent = '-';
            if (range) range.textContent = '-';
            return;
        }
        
        if (open) open.textContent = candle.open.toFixed(2);
        if (high) high.textContent = candle.high.toFixed(2);
        if (low) low.textContent = candle.low.toFixed(2);
        if (close) close.textContent = candle.close.toFixed(2);
        if (range) {
            const rangeValue = (candle.high - candle.low).toFixed(2);
            range.textContent = rangeValue;
        }
    }
    
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.offsetWidth,
                height: container.offsetHeight
            });
        }
    }
    
    updateData(data, fvgs) {
        console.log('🔄 ChartManager.updateData called:', {
            dataLength: data?.length,
            fvgsLength: fvgs?.length,
            candlestickSeries: !!this.candlestickSeries,
            chart: !!this.chart
        });
        
        if (!this.candlestickSeries) {
            console.error('❌ Chart not initialized - candlestickSeries is null');
            return;
        }
        
        this.currentData = data;
        this.currentFVGs = fvgs;
        
        const chartData = data.map(candle => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        }));
        
        console.log('📊 Setting candlestick data:', chartData.length, 'candles');
        this.candlestickSeries.setData(chartData);
        console.log('✅ Candlestick data set successfully');
        
        if (this.settings.showFVG && fvgs && fvgs.length > 0) {
            console.log('🔶 Drawing FVG rectangles:', fvgs.length);
            this.drawFVGRectangles(fvgs);
        }
        
        if (this.settings.showVolume) {
            console.log('📈 Updating volume');
            this.updateVolume(data);
        }
        
        console.log('💰 Updating price levels');
        this.updatePriceLevels(data);
        console.log('📊 Updating statistics');
        this.updateStatistics(data, fvgs);
        
        console.log('🎯 Fitting chart content');
        this.chart.timeScale().fitContent();
        
        console.log(`✅ Chart updated: ${data.length} candles, ${fvgs ? fvgs.length : 0} FVGs`);
    }
    
    drawFVGRectangles(fvgs) {
        this.clearFVGRectangles();
        
        if (!fvgs || fvgs.length === 0) return;
        
        // Separate valid and cleared FVGs
        const validFVGs = fvgs.filter(fvg => fvg.status === 'valid');
        const clearedFVGs = fvgs.filter(fvg => fvg.status === 'cleared');
        
        // Render valid FVGs only if Fair Value Gaps is enabled
        if (this.settings.showFVG) {
            console.log(`🟢 Showing ${validFVGs.length} valid FVGs (Fair Value Gaps ON)`);
            validFVGs.forEach((fvg, index) => {
                this.renderSingleFVG(fvg, index, false);
            });
        } else {
            console.log(`🔴 Hiding valid FVGs (Fair Value Gaps OFF)`);
        }
        
        // Render cleared FVGs only if Show Cleared FVGs is enabled
        if (this.settings.showClearedFVGs) {
            console.log(`🟡 Showing ${clearedFVGs.length} cleared FVGs (Show Cleared FVGs ON)`);
            clearedFVGs.forEach((fvg, index) => {
                this.renderSingleFVG(fvg, validFVGs.length + index, true);
            });
        } else {
            console.log(`🔴 Hiding cleared FVGs (Show Cleared FVGs OFF)`);
        }
        
        // Update markers in batch (only if markers enabled)
        if (this.settings.showFVGMarkers && this.fvgMarkers && this.fvgMarkers.length > 0) {
            this.candlestickSeries.setMarkers(this.fvgMarkers);
        } else {
            // Clear markers if disabled
            if (this.candlestickSeries) {
                this.candlestickSeries.setMarkers([]);
            }
        }
        
        this.updateFVGList(fvgs); // Show all FVGs in the list
        console.log(`Rendered ${validFVGs.length} valid, ${clearedFVGs.length} cleared FVGs`);
    }
    
    renderSingleFVG(fvg, index, isCleared) {
        const color = fvg.type === 'bullish' 
            ? (isCleared ? 'rgba(128, 128, 128, 0.2)' : 'rgba(0, 255, 140, 0.3)')
            : (isCleared ? 'rgba(128, 128, 128, 0.2)' : 'rgba(255, 61, 113, 0.3)');
        
        const borderColor = fvg.type === 'bullish' 
            ? (isCleared ? '#888888' : '#00d68f')
            : (isCleared ? '#888888' : '#ff3d71');
        
        try {
            // Method 4: Multiple parallel lines to simulate fill (Adaptive based on gap size)
            const fillColor = fvg.type === 'bullish' 
                ? (isCleared ? 'rgba(128, 128, 128, 0.08)' : 'rgba(0, 255, 140, 0.08)')
                : (isCleared ? 'rgba(128, 128, 128, 0.08)' : 'rgba(255, 61, 113, 0.08)');
            
            // Adaptive number of lines based on FVG gap size
            const fvgGapSize = Math.abs(fvg.topPrice - fvg.bottomPrice);
            let numberOfFillLines;
            
            if (fvgGapSize >= 100) {
                numberOfFillLines = 130;  // Very large gap
            } else if (fvgGapSize >= 80) {
                numberOfFillLines = 100;  // Large gap
            } else if (fvgGapSize >= 50) {
                numberOfFillLines = 60;   // Medium-large gap
            } else if (fvgGapSize >= 30) {
                numberOfFillLines = 20;   // Medium gap
            } else if (fvgGapSize >= 15) {
                numberOfFillLines = 10;   // Small-medium gap
            } else if (fvgGapSize >= 5) {
                numberOfFillLines = 6;    // Small gap
            } else {
                numberOfFillLines = 4;    // Very small gap
            }
            
            // Create multiple thin lines between top and bottom to simulate fill
            for (let i = 1; i < numberOfFillLines; i++) {
                const ratio = i / numberOfFillLines;
                const linePrice = fvg.bottomPrice + (fvg.topPrice - fvg.bottomPrice) * ratio;
                
                const fillLineSeries = this.chart.addLineSeries({
                    color: fillColor,
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    priceScaleId: 'right',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                
                const fillLineData = [
                    { time: fvg.startTime, value: linePrice },
                    { time: fvg.endTime, value: linePrice }
                ];
                
                fillLineSeries.setData(fillLineData);
                this.fvgPrimitives.push(fillLineSeries);
            }
            
            // Create top boundary line (very thin)
            const topLineSeries = this.chart.addLineSeries({
                color: borderColor,
                lineWidth: 0.5,  // Very thin line
                lineStyle: isCleared ? LightweightCharts.LineStyle.Dashed : LightweightCharts.LineStyle.Solid,
                priceScaleId: 'right',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            
            // Create bottom boundary line (very thin)
            const bottomLineSeries = this.chart.addLineSeries({
                color: borderColor,
                lineWidth: 0.5,  // Very thin line
                lineStyle: isCleared ? LightweightCharts.LineStyle.Dashed : LightweightCharts.LineStyle.Solid,
                priceScaleId: 'right',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            
            // Create data points for the limited time range
            const topLineData = [
                { time: fvg.startTime, value: fvg.topPrice },
                { time: fvg.endTime, value: fvg.topPrice }
            ];
            
            const bottomLineData = [
                { time: fvg.startTime, value: fvg.bottomPrice },
                { time: fvg.endTime, value: fvg.bottomPrice }
            ];
            
            topLineSeries.setData(topLineData);
            bottomLineSeries.setData(bottomLineData);
            
            // Store boundary series references for cleanup
            this.fvgPrimitives.push(topLineSeries, bottomLineSeries);
            
            // Store the marker info for later batch update 
            // (only if markers enabled and this FVG type should be shown)
            const shouldShowMarker = this.settings.showFVGMarkers && 
                ((fvg.status === 'valid' && this.settings.showFVG) || 
                 (fvg.status === 'cleared' && this.settings.showClearedFVGs));
                 
            if (shouldShowMarker) {
                this.fvgMarkers = this.fvgMarkers || [];
                this.fvgMarkers.push({
                    time: fvg.startTime,
                    position: 'belowBar',
                    color: borderColor,
                    shape: 'circle',
                    text: `F${index + 1}`,
                    size: 1
                });
            }
            
        } catch (e) {
            console.warn('FVG visualization error:', e);
        }
    }
    
    clearFVGRectangles() {
        this.fvgPrimitives.forEach(primitive => {
            try {
                // Remove series instead of price lines
                this.chart.removeSeries(primitive);
            } catch (e) {
                // Ignore errors
            }
        });
        this.fvgPrimitives = [];
        
        // Clear FVG markers
        this.fvgMarkers = [];
        if (this.candlestickSeries) {
            this.candlestickSeries.setMarkers([]);
        }
    }
    
    updateFVGList(fvgs) {
        const listContainer = document.getElementById('fvgList');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        fvgs.forEach((fvg, index) => {
            const item = document.createElement('div');
            item.className = `fvg-item ${fvg.type} ${fvg.status === 'cleared' ? 'cleared' : ''}`;
            item.innerHTML = `
                <div>FVG #${index + 1}</div>
                <div>Type: ${fvg.type}</div>
                <div>Range: ${fvg.bottomPrice.toFixed(2)} - ${fvg.topPrice.toFixed(2)}</div>
                <div>Status: ${fvg.status}</div>
            `;
            item.onclick = () => this.focusOnFVG(fvg);
            listContainer.appendChild(item);
        });
    }
    
    focusOnFVG(fvg) {
        if (!this.chart) return;
        
        const visibleRange = this.chart.timeScale().getVisibleRange();
        if (visibleRange) {
            this.chart.timeScale().setVisibleRange({
                from: fvg.startTime - 300,
                to: fvg.endTime + 300
            });
        }
    }
    
    updateVolume(data) {
        if (!this.volumeSeries) {
            this.volumeSeries = this.chart.addHistogramSeries({
                color: 'rgba(76, 175, 80, 0.3)',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '',
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });
        }
        
        const volumeData = data.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open 
                ? 'rgba(0, 255, 140, 0.3)' 
                : 'rgba(255, 61, 113, 0.3)'
        }));
        
        this.volumeSeries.setData(volumeData);
    }
    
    updatePriceLevels(data) {
        const levelsContainer = document.getElementById('priceLevels');
        if (!levelsContainer) return;
        
        const prices = data.map(d => [d.high, d.low]).flat();
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const range = maxPrice - minPrice;
        
        const levels = [];
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (range * i / 4);
            levels.push({
                price: price.toFixed(2),
                type: i === 0 ? 'Support' : i === 4 ? 'Resistance' : 'Level'
            });
        }
        
        levelsContainer.innerHTML = '';
        levels.forEach(level => {
            const item = document.createElement('div');
            item.className = 'level-item';
            item.innerHTML = `
                <span class="level-price">${level.price}</span>
                <span class="level-type">${level.type}</span>
            `;
            levelsContainer.appendChild(item);
        });
    }
    
    updateStatistics(data, fvgs) {
        if (!data || data.length === 0) return;
        
        const totalVolume = data.reduce((sum, candle) => sum + candle.volume, 0);
        document.getElementById('totalVolume').textContent = totalVolume.toLocaleString();
        
        document.getElementById('candleCount').textContent = data.length;
        
        if (fvgs) {
            const bullishCount = fvgs.filter(f => f.type === 'bullish').length;
            const bearishCount = fvgs.filter(f => f.type === 'bearish').length;
            const validCount = fvgs.filter(f => f.status === 'valid').length;
            
            document.getElementById('bullishFVG').textContent = bullishCount;
            document.getElementById('bearishFVG').textContent = bearishCount;
            document.getElementById('validFVG').textContent = validCount;
        }
    }
    
    toggleFVG(show) {
        this.settings.showFVG = show;
        if (this.currentFVGs) {
            // Always redraw to reflect the current state
            this.drawFVGRectangles(this.currentFVGs);
        }
    }
    
    toggleFVGMarkers(show) {
        this.settings.showFVGMarkers = show;
        if (this.currentFVGs) {
            this.drawFVGRectangles(this.currentFVGs);
        }
    }
    
    toggleClearedFVGs(show) {
        this.settings.showClearedFVGs = show;
        if (this.currentFVGs) {
            this.drawFVGRectangles(this.currentFVGs);
        }
    }
    
    toggleVolume(show) {
        this.settings.showVolume = show;
        if (show && this.currentData) {
            this.updateVolume(this.currentData);
        } else if (this.volumeSeries) {
            this.chart.removeSeries(this.volumeSeries);
            this.volumeSeries = null;
        }
    }
    
    
    setTool(tool) {
        this.selectedTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    }
    
    handleDrawingClick(param) {
        // Drawing tools implementation would go here
        console.log('Drawing tool:', this.selectedTool, 'at', param.point);
    }
    
    clearDrawings() {
        this.drawings.forEach(drawing => {
            // Clear drawing implementation
        });
        this.drawings = [];
    }
    
    zoomIn() {
        if (this.chart) {
            const timeScale = this.chart.timeScale();
            const currentBarSpacing = timeScale.options().barSpacing;
            timeScale.applyOptions({ barSpacing: currentBarSpacing * 1.2 });
        }
    }
    
    zoomOut() {
        if (this.chart) {
            const timeScale = this.chart.timeScale();
            const currentBarSpacing = timeScale.options().barSpacing;
            timeScale.applyOptions({ barSpacing: currentBarSpacing * 0.8 });
        }
    }
    
    fitContent() {
        if (this.chart) {
            this.chart.timeScale().fitContent();
        }
    }
    
    resetView() {
        if (this.chart) {
            this.chart.timeScale().resetTimeScale();
            this.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
            this.candlestickSeries = null;
            this.volumeSeries = null;
        }
    }
}