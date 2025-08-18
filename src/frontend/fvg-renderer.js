/**
 * FVG Renderer - Advanced Fair Value Gap Visualization
 */

class FVGRenderer {
    constructor(chart, series) {
        this.chart = chart;
        this.series = series;
        this.rectangles = [];
        this.markers = [];
    }
    
    render(fvgs) {
        this.clear();
        
        if (!fvgs || fvgs.length === 0) return;
        
        const bullishFVGs = fvgs.filter(f => f.type === 'bullish');
        const bearishFVGs = fvgs.filter(f => f.type === 'bearish');
        
        this.renderFVGBoxes(bullishFVGs, 'bullish');
        this.renderFVGBoxes(bearishFVGs, 'bearish');
        this.renderMarkers(fvgs);
    }
    
    renderFVGBoxes(fvgs, type) {
        const color = type === 'bullish' 
            ? { bg: 'rgba(0, 214, 143, 0.15)', border: 'rgba(0, 214, 143, 0.5)' }
            : { bg: 'rgba(255, 61, 113, 0.15)', border: 'rgba(255, 61, 113, 0.5)' };
        
        fvgs.forEach(fvg => {
            // Only render valid (not cleared) FVGs
            if (fvg.status === 'valid') {
                // Create top and bottom price lines
                const topLine = this.series.createPriceLine({
                    price: fvg.topPrice,
                    color: color.border,
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    axisLabelVisible: false,
                    title: `${type.toUpperCase()} FVG Top`,
                });
                
                const bottomLine = this.series.createPriceLine({
                    price: fvg.bottomPrice,
                    color: color.border,
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                    axisLabelVisible: false,
                    title: `${type.toUpperCase()} FVG Bottom`,
                });
                
                this.rectangles.push(topLine, bottomLine);
            }
        });
    }
    
    renderMarkers(fvgs) {
        // Only show markers for valid (not cleared) FVGs
        const validFVGs = fvgs.filter(fvg => fvg.status === 'valid');
        
        const markers = validFVGs.map(fvg => ({
            time: fvg.startTime,
            position: fvg.type === 'bullish' ? 'belowBar' : 'aboveBar',
            color: fvg.type === 'bullish' ? '#00d68f' : '#ff3d71',
            shape: fvg.type === 'bullish' ? 'arrowUp' : 'arrowDown',
            text: 'FVG',
            size: 1
        }));
        
        if (markers.length > 0) {
            this.series.setMarkers(markers);
            this.markers = markers;
        }
    }
    
    clear() {
        this.rectangles.forEach(rect => {
            try {
                this.series.removePriceLine(rect);
            } catch (e) {
                // Ignore errors
            }
        });
        this.rectangles = [];
        
        if (this.markers.length > 0) {
            this.series.setMarkers([]);
            this.markers = [];
        }
    }
    
    highlightFVG(fvg) {
        // Temporarily highlight a specific FVG
        const highlightLine = this.series.createPriceLine({
            price: (fvg.topPrice + fvg.bottomPrice) / 2,
            color: '#ffaa00',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: `${fvg.type.toUpperCase()} FVG`,
        });
        
        setTimeout(() => {
            try {
                this.series.removePriceLine(highlightLine);
            } catch (e) {
                // Ignore
            }
        }, 3000);
    }
    
    getStatistics(fvgs) {
        if (!fvgs || fvgs.length === 0) {
            return {
                total: 0,
                bullish: 0,
                bearish: 0,
                valid: 0,
                cleared: 0,
                avgSize: 0
            };
        }
        
        const stats = {
            total: fvgs.length,
            bullish: fvgs.filter(f => f.type === 'bullish').length,
            bearish: fvgs.filter(f => f.type === 'bearish').length,
            valid: fvgs.filter(f => f.status === 'valid').length,
            cleared: fvgs.filter(f => f.status === 'cleared').length,
            avgSize: 0
        };
        
        const sizes = fvgs.map(f => Math.abs(f.topPrice - f.bottomPrice));
        stats.avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        
        return stats;
    }
}