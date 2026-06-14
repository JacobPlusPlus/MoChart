import { CATEGORIES, CHART_COLORS, curFmt } from './utils.js';
import { records, livePrices, getAggregatedPortfolio } from './store.js';
import { currentTab } from './ui.js';

export let analysisChartInstance = null;
export let lineChartInstance = null;
export let breakdownChartInstance = null;

export function renderCharts() {
    if(currentTab !== 'charts') return;
    
    // 1. WYKRES LINIOWY (Wartość Portfela)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const timeFilter = document.getElementById('line-time-filter').value;
    
    let dates = [...new Set(records.map(r => r.date))].sort();
    let lineDataRaw = [];
    let currentQty = {};
    let currentInv = {};
    
    dates.forEach(d => {
        records.filter(r => r.date === d).forEach(r => {
            let factor = r.type === 'Sprzedaż' ? -1 : 1;
            if(!currentQty[r.name]) currentQty[r.name] = 0;
            if(!currentInv[r.name]) currentInv[r.name] = 0;
            currentQty[r.name] += Number(r.quantity) * factor;
            currentInv[r.name] += Number(r.investedPln || r.valuePln) * factor;
        });
        
        let dailyValue = 0;
        Object.keys(currentQty).forEach(name => {
            let qty = currentQty[name];
            if (qty > 0 || currentInv[name] > 0) {
                if (livePrices[name] !== undefined) {
                    dailyValue += qty * livePrices[name];
                } else {
                    dailyValue += currentInv[name];
                }
            }
        });
        lineDataRaw.push({ x: d, y: dailyValue });
    });

    if (timeFilter !== 'ALL') {
        const cutoff = new Date();
        if(timeFilter === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
        if(timeFilter === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
        if(timeFilter === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
        if(timeFilter === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);
        
        const cutoffStr = cutoff.toISOString().split('T')[0];
        lineDataRaw = lineDataRaw.filter(d => d.x >= cutoffStr);
    }

    if(lineChartInstance) lineChartInstance.destroy();
    
    let gradient = lineCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(22, 163, 74, 0.4)');
    gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');

    lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: lineDataRaw.map(d => d.x),
            datasets: [{
                label: 'Wartość Portfela',
                data: lineDataRaw.map(d => d.y),
                borderColor: '#16a34a',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#16a34a',
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${curFmt.format(c.raw)}` } } },
            scales: { y: { beginAtZero: false, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });

    // 2. WYKRES KOŁOWY / ANALIZA
    const filter = document.getElementById('chart-filter').value;
    const ctx = document.getElementById('analysisChart').getContext('2d');
    const bdContainer = document.getElementById('crypto-breakdown-container');
    const bdCtx = document.getElementById('cryptoBreakdownChart').getContext('2d');
    
    let aData = {}, totalA = 0;
    const agg = getAggregatedPortfolio();

    agg.forEach(p => {
        let key = null;
        if(filter === 'ALL_CAT') key = p.category;
        else if(filter === 'ALL_PLAT') {
            let platQtyMap = {};
            let totalQty = 0;
            records.filter(r => r.name === p.name).forEach(r => {
                let factor = r.type === 'Sprzedaż' ? -1 : 1;
                let q = Number(r.quantity) * factor;
                platQtyMap[r.platform] = (platQtyMap[r.platform] || 0) + q;
                totalQty += q;
            });
            
            if (totalQty > 0) {
                Object.keys(platQtyMap).forEach(plat => {
                    if (platQtyMap[plat] > 0) {
                        aData[plat] = (aData[plat] || 0) + (p.value * (platQtyMap[plat] / totalQty));
                    }
                });
            } else {
                let platInvMap = {};
                let totalInv = 0;
                records.filter(r => r.name === p.name).forEach(r => {
                    let factor = r.type === 'Sprzedaż' ? -1 : 1;
                    let inv = Number(r.investedPln || r.valuePln) * factor;
                    platInvMap[r.platform] = (platInvMap[r.platform] || 0) + inv;
                    totalInv += inv;
                });
                if(totalInv > 0) {
                    Object.keys(platInvMap).forEach(plat => {
                        if (platInvMap[plat] > 0) {
                            aData[plat] = (aData[plat] || 0) + (p.value * (platInvMap[plat] / totalInv));
                        }
                    });
                }
            }
            return;
        }
        else if(p.category === filter) key = p.name;

        if(key) { aData[key] = (aData[key] || 0) + p.value; }
    });

    totalA = Object.values(aData).reduce((s,v)=>s+v,0);

    if(analysisChartInstance) analysisChartInstance.destroy();
    const labels = Object.keys(aData);
    const values = Object.values(aData);
    const colors = labels.map((l, i) => filter === 'ALL_CAT' && CATEGORIES[l] ? CATEGORIES[l].color : CHART_COLORS[i % CHART_COLORS.length]);

    analysisChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
    });

    let statsHtml = `<div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
    labels.forEach((l, i) => {
        const pct = totalA > 0 ? ((values[i] / totalA) * 100).toFixed(1) : 0;
        statsHtml += `
            <div class="bg-gray-50 rounded-2xl p-4">
                <div class="flex items-center gap-2 mb-2"><span class="w-3 h-3 rounded-full" style="background-color: ${colors[i]}"></span><span class="text-sm font-semibold truncate">${l}</span></div>
                <div class="text-lg font-bold">${pct}%</div><div class="text-xs text-gray-500">${curFmt.format(values[i])}</div>
            </div>`;
    });
    document.getElementById('analysis-stats').innerHTML = statsHtml + `</div>`;

    if(filter === 'Kryptowaluty') {
        bdContainer.classList.remove('hidden');
        if(breakdownChartInstance) breakdownChartInstance.destroy();
        breakdownChartInstance = new Chart(bdCtx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Wartość PLN', data: values, backgroundColor: colors }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } else {
        bdContainer.classList.add('hidden');
    }
}

export function updateChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#9ca3af' : '#64748b';
    const gridColor = isDark ? '#374151' : '#f1f5f9';

    Chart.defaults.color = textColor;

    if (lineChartInstance) {
        lineChartInstance.options.scales.x.grid.color = gridColor;
        lineChartInstance.options.scales.y.grid.color = gridColor;
        lineChartInstance.update();
    }
    if (analysisChartInstance) {
        analysisChartInstance.update();
    }
    if (breakdownChartInstance) {
        breakdownChartInstance.options.scales.x.grid.color = gridColor;
        breakdownChartInstance.options.scales.y.grid.color = gridColor;
        breakdownChartInstance.update();
    }
}