/**
 * Chart Manager - Handles Lightweight Charts v5 integration
 */

class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.fvgRectangles = [];
        this.currentData = null;
        this.currentFVGs = null;
        this.showFVG = true;
        
        this.chartOptions = {
            width: 0,
            height: 0,
            layout: {
                background: {
                    type: 'solid',
                    color: '#1e1e1e'
                },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: {
                    color: '#2e2e2e',
                },
                horzLines: {
                    color: '#2e2e2e',
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#2e2e2e',
            },
            timeScale: {
                borderColor: '#2e2e2e',
                timeVisible: true,
                secondsVisible: false,
            },
        };
        
        this.seriesOptions = {
            upColor: '#FFFFFF',
            downColor: '#000000',
            borderUpColor: '#000000',
            borderDownColor: '#000000',
            wickUpColor: '#000000',
            wickDownColor: '#000000',
        };
    }
    
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        
        this.chartOptions.width = container.offsetWidth;
        this.chartOptions.height = container.offsetHeight || 500;
        
        this.chart = LightweightCharts.createChart(container, this.chartOptions);
        
        this.candlestickSeries = this.chart.addCandlestickSeries(this.seriesOptions);
        
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('Chart initialized with Lightweight Charts v5');
    }
    
    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.chart) {
            this.chart.applyOptions({
                width: container.offsetWidth,
                height: container.offsetHeight || 500
            });
        }
    }
    
    updateData(data, fvgs) {
        if (!this.candlestickSeries) {
            console.error('Chart not initialized');
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
        
        this.candlestickSeries.setData(chartData);
        
        this.chart.timeScale().fitContent();
        
        if (this.showFVG && fvgs && fvgs.length > 0) {
            this.drawFVGs(fvgs);
        }
        
        console.log(`Chart updated with ${data.length} candles and ${fvgs ? fvgs.length : 0} FVGs`);
    }
    
    drawFVGs(fvgs) {
        this.clearFVGs();
        
        if (!fvgs || fvgs.length === 0) return;
        
        fvgs.forEach(fvg => {
            const color = fvg.type === 'bullish' 
                ? 'rgba(0, 255, 0, 0.2)' 
                : 'rgba(255, 0, 0, 0.2)';
            
            const rectangle = {
                time: fvg.startTime,
                endTime: fvg.endTime,
                price: fvg.startPrice,
                endPrice: fvg.endPrice,
                color: color,
                borderColor: fvg.type === 'bullish' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)',
                borderWidth: 1,
                borderStyle: fvg.status === 'cleared' ? 2 : 0
            };
            
            try {
                const marker = this.candlestickSeries.createPriceLine({
                    price: (fvg.startPrice + fvg.endPrice) / 2,
                    color: color,
                    lineWidth: 0,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    axisLabelVisible: false,
                });
                
                this.fvgRectangles.push(marker);
            } catch (e) {
                console.warn('FVG rectangle drawing not fully supported in this version');
            }
        });
    }
    
    clearFVGs() {
        this.fvgRectangles.forEach(rect => {
            try {
                this.candlestickSeries.removePriceLine(rect);
            } catch (e) {
            }
        });
        this.fvgRectangles = [];
    }
    
    toggleFVG(show) {
        this.showFVG = show;
        if (show && this.currentFVGs) {
            this.drawFVGs(this.currentFVGs);
        } else {
            this.clearFVGs();
        }
    }
    
    setTimeRange(from, to) {
        if (this.chart) {
            this.chart.timeScale().setVisibleRange({
                from: from,
                to: to
            });
        }
    }
    
    fitContent() {
        if (this.chart) {
            this.chart.timeScale().fitContent();
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
            this.candlestickSeries = null;
        }
    }
}