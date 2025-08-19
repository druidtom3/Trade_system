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
        this.horizontalLines = [];  // Store horizontal line references
        this.rectangles = [];       // Store rectangle references
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
        this.tempRectangle = null;  // Temporary rectangle while drawing
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
                
                // Update temp rectangle while drawing
                if (this.isDrawing && this.selectedTool === 'rectangle' && this.drawingStart) {
                    this.updateTempRectangle(param.time, price);
                }
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
        
        console.log('📊 Updating statistics');
        this.updateStatistics(data, fvgs);
        
        console.log('🎯 Fitting chart content');
        this.chart.timeScale().fitContent();
        
        // Restore global drawings after updating data
        this.restoreGlobalDrawings();
        
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
    
    updateStatistics(data, fvgs) {
        if (!data || data.length === 0) return;
        
        const totalVolume = data.reduce((sum, candle) => sum + candle.volume, 0);
        document.getElementById('totalVolume').textContent = totalVolume.toLocaleString();
        
        document.getElementById('candleCount').textContent = data.length;
        
        if (fvgs) {
            // Calculate statistics
            const bullishAll = fvgs.filter(f => f.type === 'bullish');
            const bearishAll = fvgs.filter(f => f.type === 'bearish');
            const bullishValid = bullishAll.filter(f => f.status === 'valid');
            const bearishValid = bearishAll.filter(f => f.status === 'valid');
            const totalValid = fvgs.filter(f => f.status === 'valid').length;
            
            // Update display with Valid/Total format
            document.getElementById('bullishFVG').textContent = `${bullishValid.length} / ${bullishAll.length}`;
            document.getElementById('bearishFVG').textContent = `${bearishValid.length} / ${bearishAll.length}`;
            document.getElementById('validFVG').textContent = totalValid;
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
        // Clean up any ongoing drawing
        if (this.isDrawing) {
            this.isDrawing = false;
            this.drawingStart = null;
            this.removeTempRectangle();
        }
        
        this.selectedTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    }
    
    handleDrawingClick(param) {
        if (!param.point || !this.candlestickSeries) return;
        
        // Get price and time at click position
        const price = this.candlestickSeries.coordinateToPrice(param.point.y);
        const time = this.chart.timeScale().coordinateToTime(param.point.x);
        
        if (price === null || time === null) return;
        
        switch (this.selectedTool) {
            case 'horizontal':
                this.addHorizontalLine(price);
                break;
            case 'rectangle':
                this.handleRectangleClick(time, price);
                break;
            case 'trendline':
            case 'text':
                console.log(`Tool "${this.selectedTool}" not implemented yet`);
                alert(`${this.selectedTool} tool is not implemented yet`);
                break;
            default:
                console.log('Drawing tool:', this.selectedTool, 'at price:', price);
        }
    }
    
    addHorizontalLine(price) {
        if (!this.candlestickSeries) return;
        
        // Generate unique ID
        const id = 'hline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Create price line
        const priceLine = this.candlestickSeries.createPriceLine({
            price: price,
            color: '#2962FF',
            lineWidth: 2,
            lineStyle: 0, // Solid line
            axisLabelVisible: true,
            title: 'H-Line'
        });
        
        // Store in local array
        this.horizontalLines.push({
            id: id,
            priceLine: priceLine,
            price: price
        });
        
        // Store in global drawings (access through window)
        if (window.globalDrawings) {
            window.globalDrawings.horizontalLines.push({
                id: id,
                price: price,
                color: '#2962FF',
                width: 2
            });
        }
        
        console.log(`✅ Horizontal line added at price: ${price.toFixed(2)}`);
        
        // Update drawings info panel
        this.updateDrawingsInfo();
    }
    
    handleRectangleClick(time, price) {
        if (!this.isDrawing) {
            // First click - start drawing
            this.isDrawing = true;
            this.drawingStart = { time, price };
            console.log('📦 Rectangle drawing started at:', { time, price: price.toFixed(2) });
            
            // Create temporary visual feedback (optional)
            this.createTempRectangle(time, price, time, price);
        } else {
            // Second click - finish drawing
            this.isDrawing = false;
            
            if (this.drawingStart) {
                // Remove temporary rectangle if exists
                this.removeTempRectangle();
                
                // Create final rectangle
                this.addRectangle(
                    this.drawingStart.time,
                    this.drawingStart.price,
                    time,
                    price
                );
            }
            
            this.drawingStart = null;
        }
    }
    
    createTempRectangle(time1, price1, time2, price2) {
        // Remove any existing temp rectangle first
        this.removeTempRectangle();
        
        if (!this.chart) return;
        
        // Create temporary rectangle with dashed lines
        const tempTopLine = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        const tempBottomLine = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        const tempLeftLine = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        const tempRightLine = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Store temp rectangle series
        this.tempRectangle = {
            topLine: tempTopLine,
            bottomLine: tempBottomLine,
            leftLine: tempLeftLine,
            rightLine: tempRightLine
        };
        
        // Set initial data
        this.updateTempRectangleData(time1, price1, time2, price2);
    }
    
    updateTempRectangle(currentTime, currentPrice) {
        if (!this.tempRectangle || !this.drawingStart) return;
        
        this.updateTempRectangleData(
            this.drawingStart.time,
            this.drawingStart.price,
            currentTime,
            currentPrice
        );
    }
    
    updateTempRectangleData(time1, price1, time2, price2) {
        if (!this.tempRectangle) return;
        
        const minTime = Math.min(time1, time2);
        const maxTime = Math.max(time1, time2);
        const minPrice = Math.min(price1, price2);
        const maxPrice = Math.max(price1, price2);
        
        // Update rectangle lines
        this.tempRectangle.topLine.setData([
            { time: minTime, value: maxPrice },
            { time: maxTime, value: maxPrice }
        ]);
        
        this.tempRectangle.bottomLine.setData([
            { time: minTime, value: minPrice },
            { time: maxTime, value: minPrice }
        ]);
        
        this.tempRectangle.leftLine.setData([
            { time: minTime, value: minPrice },
            { time: minTime, value: maxPrice }
        ]);
        
        this.tempRectangle.rightLine.setData([
            { time: maxTime, value: minPrice },
            { time: maxTime, value: maxPrice }
        ]);
    }
    
    removeTempRectangle() {
        if (this.tempRectangle && this.chart) {
            // Remove all temp rectangle series
            if (this.tempRectangle.topLine) {
                this.chart.removeSeries(this.tempRectangle.topLine);
            }
            if (this.tempRectangle.bottomLine) {
                this.chart.removeSeries(this.tempRectangle.bottomLine);
            }
            if (this.tempRectangle.leftLine) {
                this.chart.removeSeries(this.tempRectangle.leftLine);
            }
            if (this.tempRectangle.rightLine) {
                this.chart.removeSeries(this.tempRectangle.rightLine);
            }
            
            this.tempRectangle = null;
        }
    }
    
    addRectangle(time1, price1, time2, price2) {
        if (!this.chart) return;
        
        // Generate unique ID
        const id = 'rect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Ensure correct order (min/max)
        const minTime = Math.min(time1, time2);
        const maxTime = Math.max(time1, time2);
        const minPrice = Math.min(price1, price2);
        const maxPrice = Math.max(price1, price2);
        
        // Create rectangle using multiple line series (similar to FVG)
        const topLineSeries = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            lineStyle: 0,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        const bottomLineSeries = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            lineStyle: 0,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        // Set data for top and bottom lines
        topLineSeries.setData([
            { time: minTime, value: maxPrice },
            { time: maxTime, value: maxPrice }
        ]);
        
        bottomLineSeries.setData([
            { time: minTime, value: minPrice },
            { time: maxTime, value: minPrice }
        ]);
        
        // Add left and right vertical lines
        const leftLineSeries = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            lineStyle: 0,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        const rightLineSeries = this.chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            lineStyle: 0,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        
        leftLineSeries.setData([
            { time: minTime, value: minPrice },
            { time: minTime, value: maxPrice }
        ]);
        
        rightLineSeries.setData([
            { time: maxTime, value: minPrice },
            { time: maxTime, value: maxPrice }
        ]);
        
        // Add semi-transparent fill (multiple lines)
        const fillLines = [];
        const numberOfFillLines = 20;
        for (let i = 1; i < numberOfFillLines; i++) {
            const fillPrice = minPrice + (maxPrice - minPrice) * (i / numberOfFillLines);
            const fillLineSeries = this.chart.addLineSeries({
                color: 'rgba(41, 98, 255, 0.1)',
                lineWidth: 1,
                lineStyle: 0,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            fillLineSeries.setData([
                { time: minTime, value: fillPrice },
                { time: maxTime, value: fillPrice }
            ]);
            fillLines.push(fillLineSeries);
        }
        
        // Store rectangle reference
        const rectangle = {
            id: id,
            series: [topLineSeries, bottomLineSeries, leftLineSeries, rightLineSeries, ...fillLines],
            time1: minTime,
            price1: minPrice,
            time2: maxTime,
            price2: maxPrice
        };
        
        this.rectangles.push(rectangle);
        
        // Store in global drawings
        if (window.globalDrawings) {
            window.globalDrawings.rectangles.push({
                id: id,
                time1: minTime,
                price1: minPrice,
                time2: maxTime,
                price2: maxPrice,
                color: '#2962FF',
                fillColor: 'rgba(41, 98, 255, 0.1)'
            });
        }
        
        console.log(`✅ Rectangle added: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`);
        
        // Update drawings info panel
        this.updateDrawingsInfo();
    }
    
    restoreGlobalDrawings() {
        if (!window.globalDrawings || !this.candlestickSeries) return;
        
        // Clear existing local horizontal lines first
        this.horizontalLines.forEach(line => {
            if (line.priceLine) {
                this.candlestickSeries.removePriceLine(line.priceLine);
            }
        });
        this.horizontalLines = [];
        
        // Restore horizontal lines from global storage
        window.globalDrawings.horizontalLines.forEach(lineData => {
            const priceLine = this.candlestickSeries.createPriceLine({
                price: lineData.price,
                color: lineData.color || '#2962FF',
                lineWidth: lineData.width || 2,
                lineStyle: 0, // Solid line
                axisLabelVisible: true,
                title: 'H-Line'
            });
            
            this.horizontalLines.push({
                id: lineData.id,
                priceLine: priceLine,
                price: lineData.price
            });
        });
        
        if (window.globalDrawings.horizontalLines.length > 0) {
            console.log(`📏 Restored ${window.globalDrawings.horizontalLines.length} horizontal lines`);
        }
        
        // Clear existing rectangles
        this.rectangles.forEach(rect => {
            rect.series.forEach(series => {
                if (this.chart) {
                    this.chart.removeSeries(series);
                }
            });
        });
        this.rectangles = [];
        
        // Restore rectangles from global storage
        window.globalDrawings.rectangles.forEach(rectData => {
            this.addRectangle(
                rectData.time1,
                rectData.price1,
                rectData.time2,
                rectData.price2
            );
        });
        
        if (window.globalDrawings.rectangles.length > 0) {
            console.log(`📦 Restored ${window.globalDrawings.rectangles.length} rectangles`);
        }
        
        // Update drawings info panel after restoring
        this.updateDrawingsInfo();
    }
    
    clearDrawings() {
        // Clear horizontal lines
        this.horizontalLines.forEach(line => {
            if (this.candlestickSeries && line.priceLine) {
                this.candlestickSeries.removePriceLine(line.priceLine);
            }
        });
        this.horizontalLines = [];
        
        // Clear rectangles
        this.rectangles.forEach(rect => {
            rect.series.forEach(series => {
                if (this.chart) {
                    this.chart.removeSeries(series);
                }
            });
        });
        this.rectangles = [];
        
        // Clear global storage
        if (window.globalDrawings) {
            window.globalDrawings.horizontalLines = [];
            window.globalDrawings.rectangles = [];
        }
        
        // Clear other drawings (when implemented)
        this.drawings.forEach(drawing => {
            // Clear other drawing types
        });
        this.drawings = [];
        
        // Reset drawing state
        this.isDrawing = false;
        this.drawingStart = null;
        this.removeTempRectangle();
        
        console.log('✅ All drawings cleared');
        
        // Update drawings info panel
        this.updateDrawingsInfo();
    }
    
    updateDrawingsInfo() {
        const horizontalLinesCount = window.globalDrawings?.horizontalLines?.length || 0;
        const rectanglesCount = window.globalDrawings?.rectangles?.length || 0;
        
        // Update counts
        const hlCountElement = document.getElementById('horizontalLinesCount');
        const rectCountElement = document.getElementById('rectanglesCount');
        
        if (hlCountElement) hlCountElement.textContent = horizontalLinesCount;
        if (rectCountElement) rectCountElement.textContent = rectanglesCount;
        
        // Update drawings list
        this.updateDrawingsList();
    }
    
    updateDrawingsList() {
        const drawingsList = document.getElementById('drawingsList');
        const noDrawings = document.getElementById('noDrawings');
        
        if (!drawingsList) return;
        
        // Clear existing list
        drawingsList.innerHTML = '';
        
        const totalDrawings = (window.globalDrawings?.horizontalLines?.length || 0) + 
                            (window.globalDrawings?.rectangles?.length || 0);
        
        if (totalDrawings === 0) {
            const noDrawingsElement = document.createElement('div');
            noDrawingsElement.className = 'no-drawings';
            noDrawingsElement.setAttribute('data-translate', 'no_drawings');
            noDrawingsElement.textContent = window.languageManager ? window.languageManager.t('no_drawings') : 'No drawings yet';
            drawingsList.appendChild(noDrawingsElement);
            return;
        }
        
        // Add horizontal lines
        if (window.globalDrawings?.horizontalLines) {
            window.globalDrawings.horizontalLines.forEach((line, index) => {
                const lineElement = this.createHorizontalLineElement(line, index);
                drawingsList.appendChild(lineElement);
            });
        }
        
        // Add rectangles
        if (window.globalDrawings?.rectangles) {
            window.globalDrawings.rectangles.forEach((rect, index) => {
                const rectElement = this.createRectangleElement(rect, index);
                drawingsList.appendChild(rectElement);
            });
        }
    }
    
    createHorizontalLineElement(line, index) {
        const element = document.createElement('div');
        element.className = 'drawing-item';
        
        const shortId = line.id.split('_').pop().substr(0, 6);
        
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (key) => key;
        
        element.innerHTML = `
            <div class="drawing-item-header">
                <span class="drawing-type">${t('horizontal_line')}</span>
                <span class="drawing-id">#${shortId}</span>
            </div>
            <div class="drawing-details">
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('price')}:</span>
                    <span class="drawing-detail-value">${line.price.toFixed(2)}</span>
                </div>
            </div>
            <div class="drawing-actions">
                <button class="drawing-action-btn" onclick="chartManager.removeDrawing('horizontal', '${line.id}')">${t('remove')}</button>
            </div>
        `;
        
        return element;
    }
    
    createRectangleElement(rect, index) {
        const element = document.createElement('div');
        element.className = 'drawing-item';
        
        const shortId = rect.id.split('_').pop().substr(0, 6);
        
        // Calculate rectangle details
        const details = this.calculateRectangleDetails(rect);
        const t = window.languageManager ? window.languageManager.t.bind(window.languageManager) : (key) => key;
        
        element.innerHTML = `
            <div class="drawing-item-header">
                <span class="drawing-type">${t('rectangle')}</span>
                <span class="drawing-id">#${shortId}</span>
            </div>
            <div class="drawing-details">
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('time_range')}:</span>
                    <span class="drawing-detail-value">${details.timeRange}</span>
                </div>
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('price_range')}:</span>
                    <span class="drawing-detail-value">${details.priceRange}</span>
                </div>
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('height')}:</span>
                    <span class="drawing-detail-value">${details.height.toFixed(2)} (${details.heightPercent}%)</span>
                </div>
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('candles')}:</span>
                    <span class="drawing-detail-value">${details.candleCount} ${t('bars')}</span>
                </div>
                <div class="drawing-detail-row">
                    <span class="drawing-detail-label">${t('duration')}:</span>
                    <span class="drawing-detail-value">${details.duration}</span>
                </div>
            </div>
            <div class="drawing-actions">
                <button class="drawing-action-btn" onclick="chartManager.removeDrawing('rectangle', '${rect.id}')">${t('remove')}</button>
                <button class="drawing-action-btn" onclick="chartManager.zoomToDrawing('rectangle', '${rect.id}')">${t('zoom')}</button>
            </div>
        `;
        
        return element;
    }
    
    calculateRectangleDetails(rect) {
        const startTime = new Date(rect.time1 * 1000);
        const endTime = new Date(rect.time2 * 1000);
        const timeDiff = Math.abs(rect.time2 - rect.time1);
        
        // Calculate time range display
        const timeRange = `${startTime.toLocaleDateString()} - ${endTime.toLocaleDateString()}`;
        
        // Calculate price range
        const minPrice = Math.min(rect.price1, rect.price2);
        const maxPrice = Math.max(rect.price1, rect.price2);
        const height = maxPrice - minPrice;
        const priceRange = `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
        
        // Calculate height percentage (relative to current visible price range)
        let heightPercent = 0;
        if (this.currentData && this.currentData.length > 0) {
            const prices = this.currentData.map(candle => [candle.high, candle.low]).flat();
            const dataMin = Math.min(...prices);
            const dataMax = Math.max(...prices);
            const dataRange = dataMax - dataMin;
            if (dataRange > 0) {
                heightPercent = ((height / dataRange) * 100).toFixed(1);
            }
        }
        
        // Estimate candle count (this is approximate based on timeframe)
        const currentTF = (typeof currentTimeframe !== 'undefined' ? currentTimeframe : null) || 'M15';
        const minutesPerCandle = this.getMinutesPerCandle(currentTF);
        const totalMinutes = timeDiff / 60; // Convert seconds to minutes
        const candleCount = Math.round(totalMinutes / minutesPerCandle);
        
        // Calculate duration string
        const duration = this.formatDuration(timeDiff);
        
        return {
            timeRange,
            priceRange,
            height,
            heightPercent,
            candleCount,
            duration
        };
    }
    
    getMinutesPerCandle(timeframe) {
        const timeframeMap = {
            'M1': 1,
            'M5': 5,
            'M15': 15,
            'H1': 60,
            'H4': 240,
            'D1': 1440
        };
        return timeframeMap[timeframe] || 15;
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    removeDrawing(type, id) {
        if (type === 'horizontal') {
            // Remove from global storage
            if (window.globalDrawings?.horizontalLines) {
                window.globalDrawings.horizontalLines = window.globalDrawings.horizontalLines.filter(line => line.id !== id);
            }
            
            // Remove from local storage
            this.horizontalLines = this.horizontalLines.filter(line => {
                if (line.id === id) {
                    if (this.candlestickSeries && line.priceLine) {
                        this.candlestickSeries.removePriceLine(line.priceLine);
                    }
                    return false;
                }
                return true;
            });
            
        } else if (type === 'rectangle') {
            // Remove from global storage
            if (window.globalDrawings?.rectangles) {
                window.globalDrawings.rectangles = window.globalDrawings.rectangles.filter(rect => rect.id !== id);
            }
            
            // Remove from local storage
            this.rectangles = this.rectangles.filter(rect => {
                if (rect.id === id) {
                    rect.series.forEach(series => {
                        if (this.chart) {
                            this.chart.removeSeries(series);
                        }
                    });
                    return false;
                }
                return true;
            });
        }
        
        // Update the panel
        this.updateDrawingsInfo();
    }
    
    zoomToDrawing(type, id) {
        if (type === 'rectangle') {
            const rect = window.globalDrawings?.rectangles?.find(r => r.id === id);
            if (rect && this.chart) {
                const timeScale = this.chart.timeScale();
                timeScale.setVisibleRange({
                    from: rect.time1,
                    to: rect.time2
                });
            }
        }
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
    
    // Append a single candle for replay mode
    appendCandle(candle) {
        if (!this.candlestickSeries) {
            console.error('❌ Chart not initialized - cannot append candle');
            return;
        }
        
        // Validate timestamp (critical for preventing price jumps)
        if (!candle.time || typeof candle.time !== 'number') {
            console.error('❌ Invalid timestamp in candle:', candle);
            return;
        }
        
        // Check for reasonable timestamp range (not too far in past/future)
        const now = Date.now() / 1000;
        const minTime = now - (10 * 365 * 24 * 60 * 60); // 10 years ago
        const maxTime = now + (365 * 24 * 60 * 60); // 1 year in future
        
        if (candle.time < minTime || candle.time > maxTime) {
            console.error('❌ Timestamp out of reasonable range:', {
                timestamp: candle.time,
                date: new Date(candle.time * 1000).toISOString(),
                candle: candle
            });
            return;
        }
        
        // Validate price data
        if (typeof candle.open !== 'number' || typeof candle.high !== 'number' || 
            typeof candle.low !== 'number' || typeof candle.close !== 'number') {
            console.error('❌ Invalid price data in candle:', candle);
            return;
        }
        
        const chartCandle = {
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        };
        
        console.log('📊 Appending validated candle:', chartCandle);
        this.candlestickSeries.update(chartCandle);
        
        // Scroll to show the new candle (critical for replay visibility)
        this.chart.timeScale().scrollToRealTime();
        
        // Update volume if enabled
        if (this.settings.showVolume && this.volumeSeries && candle.volume !== undefined) {
            this.volumeSeries.update({
                time: candle.time,
                value: candle.volume,
                color: candle.close >= candle.open ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)'
            });
        }
    }
    
    // Clear all data and start fresh for replay mode
    clearForReplay() {
        if (this.candlestickSeries) {
            this.candlestickSeries.setData([]);
        }
        if (this.volumeSeries) {
            this.volumeSeries.setData([]);
        }
        this.clearFVGRectangles();
        console.log('🧹 Chart cleared for replay');
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