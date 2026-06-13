// --- KONFIGURACJA ---
const CATEGORIES = {
    'Kryptowaluty': { icon: 'ph-currency-btc', color: '#8b5cf6', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    'ETF': { icon: 'ph-trend-up', color: '#3b82f6', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    'Surowce': { icon: 'ph-cube', color: '#94a3b8', bgColor: 'bg-slate-100', iconColor: 'text-slate-600' },
    'Obligacje': { icon: 'ph-scroll', color: '#f59e0b', bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
    'Gotówka': { icon: 'ph-money', color: '#10b981', bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' }
};

const CRYPTO_ICONS = {
    'Bitcoin':  'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
    'Ethereum': 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
    'XRP':      'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png',
    'BNB':      'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png',
    'USDC':     'https://assets.coingecko.com/coins/images/6319/thumb/usdc.png',
    'USDT':     'https://assets.coingecko.com/coins/images/325/thumb/Tether.png',
    'Solana':   'https://assets.coingecko.com/coins/images/4128/thumb/solana.png',
};

function getAssetIconHTML(name, category, catCfg, sizeClass = 'w-10 h-10') {
    if (category === 'Kryptowaluty' && CRYPTO_ICONS[name]) {
        return `<img src="${CRYPTO_ICONS[name]}" class="${sizeClass} rounded-full object-contain bg-gray-900 p-1 flex-shrink-0" onerror="this.outerHTML='<div class=\\'${sizeClass} rounded-full ${catCfg.bgColor} flex items-center justify-center ${catCfg.iconColor} flex-shrink-0\\'><i class=\\'ph-fill ph-currency-btc text-xl\\'></i></div>'">`;
    }
    return `<div class="${sizeClass} rounded-full ${catCfg.bgColor} flex items-center justify-center ${catCfg.iconColor} flex-shrink-0"><i class="ph-fill ${catCfg.icon} text-xl"></i></div>`;
}

const CHART_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// --- STAN APLIKACJI ---
let records = JSON.parse(localStorage.getItem('moChartTxs')) || [];
let goals = JSON.parse(localStorage.getItem('moChartGoals')) || [];
let livePrices = {}; 

// Kompatybilność wsteczna
records = records.map(r => ({ ...r, type: r.type || 'Zakup', notes: r.notes || '' }));

let analysisChartInstance = null;
let lineChartInstance = null;
let breakdownChartInstance = null;
let currentTab = 'dashboard';

const curFmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
const numFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 6 });

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('asset-form').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
    renderAll();
    
    const savedTab = sessionStorage.getItem('moChartTab');
    if(savedTab) switchTab(savedTab);
});

function populateAssetFilter() {
    const select = document.getElementById('filter-asset');
    const currentVal = select.value;
    const uniqueAssets = [...new Set(records.map(r => r.name))].sort();
    select.innerHTML = '<option value="ALL">Wszystkie aktywa</option>';
    uniqueAssets.forEach(a => { select.innerHTML += `<option value="${a}">${a}</option>`; });
    if (uniqueAssets.includes(currentVal)) { select.value = currentVal; }
}

function populateAssetNameSuggestions() {
    const datalist = document.getElementById('asset-name-suggestions');
    const uniqueAssets = [...new Set(records.map(r => r.name))].sort();
    datalist.innerHTML = '';
    uniqueAssets.forEach(a => {
        datalist.innerHTML += `<option value="${a}">`;
    });
}

function renderAll() {
    localStorage.setItem('moChartTxs', JSON.stringify(records));
    localStorage.setItem('moChartGoals', JSON.stringify(goals));
    
    updateHero();
    renderDashboard();
    renderResults();
    populateAssetFilter();
    populateAssetNameSuggestions();
    renderHistory();
    renderGoals();
    if(currentTab === 'charts') renderCharts();
    populateGoalAssetSelect();
}

function switchTab(tabId) {
    ['dashboard', 'results', 'charts', 'history', 'goals'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.remove('active');
        document.getElementById(`view-${t}`).classList.add('hidden');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    currentTab = tabId;
    sessionStorage.setItem('moChartTab', tabId);
    if(tabId === 'charts') renderCharts();
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    let icon = document.getElementById('toast-icon');
    if (type === 'success') icon.className = 'ph-fill ph-check-circle text-brand-500 text-lg';
    else if (type === 'error') icon.className = 'ph-fill ph-warning-circle text-red-500 text-lg';
    else if (type === 'info') icon.className = 'ph-fill ph-info text-blue-400 text-lg';
    else icon.className = 'ph-fill ph-warning-circle text-yellow-500 text-lg';
    
    t.classList.remove('opacity-0');
    setTimeout(() => t.classList.add('opacity-0'), 3000);
}

// --- POBIERANIE CEN KRYPTO + METALE SZLACHETNE ---
async function refreshCryptoPrices() {
    const spinIcons = document.querySelectorAll('.ph-arrows-clockwise');
    spinIcons.forEach(i => i.classList.add('animate-spin'));
    
    try {
        showToast("Pobieranie cen...", "info");
        const fetchTicker = sym => fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`).then(r=>r.json()).catch(()=>null);
        
        const [btc, eth, xrp, bnb, usd] = await Promise.all([
            fetchTicker('BTCUSDT'), fetchTicker('ETHUSDT'), fetchTicker('XRPUSDT'), fetchTicker('BNBUSDT'),
            fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).catch(()=>null)
        ]);

        if(!usd || !usd.rates || !usd.rates.PLN) throw new Error("Błąd pobierania kursu USD");
        const usdPln = usd.rates.PLN;

        if(btc) livePrices['Bitcoin'] = Number(btc.price) * usdPln;
        if(eth) livePrices['Ethereum'] = Number(eth.price) * usdPln;
        if(xrp) livePrices['XRP'] = Number(xrp.price) * usdPln;
        if(bnb) livePrices['BNB'] = Number(bnb.price) * usdPln;

        const [silverRes, goldRes] = await Promise.all([
            fetch('https://api.frankfurter.app/latest?from=XAG&to=PLN').then(r=>r.json()).catch(()=>null),
            fetch('https://api.frankfurter.app/latest?from=XAU&to=PLN').then(r=>r.json()).catch(()=>null)
        ]);
        
        if(silverRes?.rates?.PLN) livePrices['Srebro'] = silverRes.rates.PLN;
        if(goldRes?.rates?.PLN) livePrices['Złoto'] = goldRes.rates.PLN;

        const now = new Date();
        document.getElementById('last-price-update').innerText = `Ceny z: ${now.toLocaleTimeString('pl-PL')}`;
        renderAll();
        showToast("Ceny zaktualizowane pomyślnie!", "success");
    } catch (e) {
        console.error(e);
        showToast("Brak połączenia z API", "error");
    } finally {
        spinIcons.forEach(i => i.classList.remove('animate-spin'));
    }
}

// --- AGREGACJA DANYCH ---
function getAggregatedPortfolio() {
    const portfolio = {};
    records.forEach(r => {
        const key = r.name;
        if(!portfolio[key]) portfolio[key] = { name: r.name, category: r.category, qty: 0, value: 0, invested: 0 };
        
        const factor = r.type === 'Sprzedaż' ? -1 : 1;
        portfolio[key].qty += Number(r.quantity) * factor;
        // Sumujemy fallback historyczny
        portfolio[key].value += Number(r.valuePln) * factor;
        portfolio[key].invested += Number(r.investedPln || r.valuePln) * factor;
    });
    
    // Aplikacja cen na żywo (bez nadpisywania rekordów)
    return Object.values(portfolio).map(p => {
        if(p.qty > 0 || p.value > 0) {
            if(livePrices[p.name] !== undefined) {
                p.value = p.qty * livePrices[p.name];
            }
            return p;
        }
        return null;
    }).filter(p => p !== null && (p.qty > 0 || p.value > 0));
}

function updateHero() {
    const aggregated = getAggregatedPortfolio();
    const totalValue = aggregated.reduce((sum, p) => sum + p.value, 0);
    const totalInvested = aggregated.reduce((sum, p) => sum + p.invested, 0);
    const profit = totalValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    document.getElementById('total-balance').textContent = curFmt.format(totalValue);
    document.getElementById('total-invested').textContent = curFmt.format(totalInvested);

    const container = document.getElementById('total-profit-container');
    if (totalValue === 0) {
        container.innerHTML = `<span class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">Brak danych</span>`;
    } else {
        const isProf = profit >= 0;
        container.innerHTML = `
            <span class="${isProf?'bg-brand-100 text-brand-700':'bg-red-100 text-red-700'} px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1">
                <i class="ph-bold ${isProf?'ph-trend-up':'ph-trend-down'}"></i> ${curFmt.format(profit)} (${profitPercent.toFixed(2)}%)
            </span>`;
    }
}

// --- DASHBOARD ---
function renderDashboard() {
    const container = document.getElementById('dashboard-assets');
    container.innerHTML = '';
    const aggregated = getAggregatedPortfolio().sort((a,b) => b.value - a.value);

    if (aggregated.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">Brak aktywów.</div>`;
        return;
    }

    aggregated.forEach(item => {
        const catCfg = CATEGORIES[item.category] || CATEGORIES['Gotówka'];
        const prof = item.value - item.invested;
        const isProf = prof >= 0;
        const badge = item.invested > 0 && prof !== 0 ? 
            `<span class="text-xs ${isProf?'text-brand-600 bg-brand-50':'text-red-600 bg-red-50'} px-2 py-0.5 rounded font-bold">
                ${isProf?'+':''}${((prof/item.invested)*100).toFixed(2)}%
            </span>` : '';
        
        const platforms = [...new Set(records.filter(r => r.name === item.name).map(r => r.platform))];

        container.innerHTML += `
            <div onclick="openAssetDetails('${item.name}')" class="cursor-pointer group flex flex-col justify-between p-5 bg-white border border-gray-100 rounded-3xl hover:shadow-md hover:border-brand-200 transition-all">
                <div class="flex items-center gap-3 mb-4">
                    ${getAssetIconHTML(item.name, item.category, catCfg)}
                    <div>
                        <h4 class="font-bold text-gray-900 leading-tight">${item.name}</h4>
                        <p class="text-xs text-gray-500 font-medium">${numFmt.format(item.qty)} szt.</p>
                        <p class="text-xs text-gray-400">${platforms.join(', ')}</p>
                    </div>
                </div>
                <div class="flex items-end justify-between">
                    <div class="font-bold text-gray-900 text-lg">${curFmt.format(item.value)}</div>
                    ${badge}
                </div>
            </div>`;
    });
}

// --- WYNIKI PER PLATFORMA ---
function renderResults() {
    const tbody = document.getElementById('results-table');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-400">Brak transakcji...</td></tr>`;
        return;
    }

    const platMap = {};
    records.forEach(r => {
        if(!platMap[r.platform]) platMap[r.platform] = { invested: 0, value: 0, assets: {} };
        const f = r.type === 'Sprzedaż' ? -1 : 1;
        platMap[r.platform].invested += Number(r.investedPln || r.valuePln) * f;
        
        if(!platMap[r.platform].assets[r.name]) platMap[r.platform].assets[r.name] = {qty: 0, val: 0};
        platMap[r.platform].assets[r.name].qty += Number(r.quantity) * f;
        platMap[r.platform].assets[r.name].val += Number(r.valuePln) * f;
    });

    let sumInvested = 0;
    let sumValue = 0;

    const plats = Object.keys(platMap).sort();
    plats.forEach(p => {
        const data = platMap[p];
        let currentVal = 0;
        
        // Przeliczanie przy użyciu cen live
        Object.keys(data.assets).forEach(aName => {
            const a = data.assets[aName];
            if(livePrices[aName] !== undefined) {
                currentVal += a.qty * livePrices[aName];
            } else {
                currentVal += a.val;
            }
        });
        
        data.value = currentVal;
        sumInvested += data.invested;
        sumValue += data.value;

        const prof = data.value - data.invested;
        const profPct = data.invested > 0 ? (prof/data.invested)*100 : 0;
        const cColor = prof >= 0 ? 'text-brand-600' : 'text-red-600';

        tbody.innerHTML += `
            <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                <td class="py-4 font-bold text-gray-900">${p}</td>
                <td class="py-4 text-right text-gray-600">${curFmt.format(data.invested)}</td>
                <td class="py-4 text-right font-semibold text-gray-900">${curFmt.format(data.value)}</td>
                <td class="py-4 text-right font-bold ${cColor}">${curFmt.format(prof)}</td>
                <td class="py-4 text-right font-bold ${cColor}">${profPct.toFixed(2)}%</td>
            </tr>`;
    });

    // WIERSZ SUMA
    const totalProf = sumValue - sumInvested;
    const totalProfPct = sumInvested > 0 ? (totalProf/sumInvested)*100 : 0;
    const sColor = totalProf >= 0 ? 'text-brand-600' : 'text-red-600';
    
    tbody.innerHTML += `
        <tr class="border-t-2 border-gray-200 bg-gray-50">
            <td class="py-4 font-bold text-gray-900 uppercase">SUMA</td>
            <td class="py-4 text-right font-bold text-gray-900">${curFmt.format(sumInvested)}</td>
            <td class="py-4 text-right font-bold text-gray-900">${curFmt.format(sumValue)}</td>
            <td class="py-4 text-right font-bold ${sColor}">${curFmt.format(totalProf)}</td>
            <td class="py-4 text-right font-bold ${sColor}">${totalProfPct.toFixed(2)}%</td>
        </tr>`;
}

// --- SZCZEGÓŁY AKTYWA (MODAL) ---
function openAssetDetails(name) {
    const txs = records.filter(r => r.name === name).sort((a,b) => new Date(b.date) - new Date(a.date));
    let tQty = 0, tInv = 0, tValFallback = 0;
    
    const tbody = document.getElementById('details-table');
    tbody.innerHTML = '';

    txs.forEach(r => {
        const f = r.type === 'Sprzedaż' ? -1 : 1;
        tQty += Number(r.quantity) * f;
        tInv += Number(r.investedPln || r.valuePln) * f;
        tValFallback += Number(r.valuePln) * f;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 text-gray-600">${r.date}</td>
                <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${r.type==='Zakup'?'bg-brand-50 text-brand-700':'bg-red-50 text-red-700'}">${r.type}</span></td>
                <td class="p-3 text-right">${numFmt.format(r.quantity)}</td>
                <td class="p-3 text-right">${curFmt.format(r.investedPln || r.valuePln)}</td>
                <td class="p-3 text-gray-500 text-xs italic">${r.notes || '-'}</td>
                <td class="p-3 text-center"><button onclick="closeModals(); setTimeout(() => editRecord('${r.id}'), 350)" class="text-gray-400 hover:text-blue-500 p-1"><i class="ph-fill ph-pencil-simple text-lg"></i></button></td>
            </tr>`;
    });

    const avgPrice = tQty > 0 ? tInv / tQty : 0;
    let currentVal = (livePrices[name] !== undefined) ? (tQty * livePrices[name]) : tValFallback;
    const prof = currentVal - tInv;

    const cat = records.find(r=>r.name===name)?.category || '';
    const catCfg = CATEGORIES[cat] || CATEGORIES['Gotówka'];

    document.getElementById('details-title').innerHTML = `<div class="flex items-center gap-3">${getAssetIconHTML(name, cat, catCfg)}<span>${name}</span></div>`;
    document.getElementById('details-stats').innerHTML = `
        <div class="bg-gray-50 p-4 rounded-2xl"><p class="text-xs text-gray-500 uppercase">Ilość</p><p class="font-bold text-lg">${numFmt.format(tQty)}</p></div>
        <div class="bg-gray-50 p-4 rounded-2xl"><p class="text-xs text-gray-500 uppercase">Wartość obecna</p><p class="font-bold text-lg">${curFmt.format(currentVal)}</p></div>
        <div class="bg-gray-50 p-4 rounded-2xl"><p class="text-xs text-gray-500 uppercase">Średnia cena zakupu</p><p class="font-bold text-lg">${curFmt.format(avgPrice)}</p></div>
        <div class="bg-gray-50 p-4 rounded-2xl"><p class="text-xs text-gray-500 uppercase">Zysk / Strata</p><p class="font-bold text-lg ${prof>=0?'text-brand-600':'text-red-600'}">${curFmt.format(prof)}</p></div>
    `;

    const m = document.getElementById('asset-details-modal');
    m.classList.remove('hidden');
    setTimeout(() => m.classList.remove('opacity-0'), 10);
}

// --- HISTORIA ---
function clearAllFilters() {
    document.getElementById('filter-asset').value = 'ALL';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById('history-table');
    tbody.innerHTML = '';
    
    let asset = document.getElementById('filter-asset').value;
    let from = document.getElementById('filter-date-from').value;
    let to = document.getElementById('filter-date-to').value;
    let filtered = [...records].sort((a,b) => new Date(b.date) - new Date(a.date));

    if(asset !== 'ALL') filtered = filtered.filter(r => r.name === asset);
    if(from) filtered = filtered.filter(r => new Date(r.date) >= new Date(from));
    if(to) filtered = filtered.filter(r => new Date(r.date) <= new Date(to));

    document.getElementById('history-count').textContent = `Wyświetlono ${filtered.length} transakcji`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-gray-400"><i class="ph ph-magnifying-glass text-2xl mb-2 block"></i>Brak transakcji spełniających kryteria filtrowania.</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        const tColor = r.type === 'Sprzedaż' ? 'text-red-600 bg-red-50' : 'text-brand-600 bg-brand-50';
        tbody.innerHTML += `
            <tr class="border-b border-gray-50 hover:bg-gray-50 group">
                <td class="py-4 text-gray-600 font-medium">${r.date}</td>
                <td class="py-4">
                    <div class="font-semibold text-gray-900">${r.name}</div>
                    ${r.notes ? `<div class="text-xs text-gray-400 mt-1"><i class="ph ph-chat-text"></i> ${r.notes}</div>` : ''}
                </td>
                <td class="py-4"><span class="px-2 py-1 rounded text-xs font-bold ${tColor}">${r.type}</span></td>
                <td class="py-4 text-right">${numFmt.format(r.quantity)}</td>
                <td class="py-4 text-right">${curFmt.format(r.investedPln || r.valuePln)}</td>
                <td class="py-4 text-right font-semibold text-gray-900">${curFmt.format(r.valuePln)}</td>
                <td class="py-4 text-center">
                    <button onclick="editRecord('${r.id}')" class="text-gray-400 hover:text-blue-500 p-1"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                    <button onclick="deleteRecord('${r.id}')" class="text-gray-400 hover:text-red-500 p-1"><i class="ph-fill ph-trash text-lg"></i></button>
                </td>
            </tr>`;
    });
}

// --- WYKRESY ---
function renderCharts() {
    if(currentTab !== 'charts') return;
    
    // 1. WYKRES LINIOWY (Wartość Portfela)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const timeFilter = document.getElementById('line-time-filter').value;
    
    // Historia zasobów chronologicznie
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

    // Filtry czasowe
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
                // Fallback na wypadek gdy ilość to 0, ale wartość została (obliczanie po investedPln)
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

    // Tabela podsumowująca
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

    // 3. CRYPTO BREAKDOWN
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

// --- CELE FINANSOWE ---
function populateGoalAssetSelect() {
    const select = document.getElementById('goal-asset');
    select.innerHTML = '<option value="ALL">Cały Portfel</option>';
    const agg = getAggregatedPortfolio();
    agg.forEach(a => select.innerHTML += `<option value="${a.name}">${a.name}</option>`);
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';
    
    if(goals.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">Brak celów. Dodaj swój pierwszy cel.</div>`;
        return;
    }

    const agg = getAggregatedPortfolio();
    const totalPort = agg.reduce((s, a) => s + a.value, 0);

    goals.forEach(g => {
        let currentVal = 0;
        if(g.assetName === 'ALL') currentVal = totalPort;
        else {
            const f = agg.find(a => a.name === g.assetName);
            if(f) currentVal = f.value;
        }

        const pct = Math.min((currentVal / g.targetAmount) * 100, 100);
        const remain = Math.max(g.targetAmount - currentVal, 0);
        const isReached = pct >= 100;
        
        const badgeHTML = isReached ? `<span class="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-full align-middle ml-1">✓ Osiągnięto!</span>` : '';
        const progressClass = isReached ? 'gold-progress' : '';
        const progressStyle = isReached ? 'style="accent-color: #f59e0b"' : '';

        container.innerHTML += `
            <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group">
                <button onclick="editGoal('${g.id}')" class="absolute top-4 right-12 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-all"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                <button onclick="deleteGoal('${g.id}')" class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><i class="ph-fill ph-trash text-lg"></i></button>
                <h4 class="text-lg font-bold text-gray-900 mb-1">${g.name} ${badgeHTML}</h4>
                <p class="text-sm text-gray-500 mb-4 flex gap-2 items-center">
                    <i class="ph ph-calendar"></i> Do: ${new Date(g.targetDate).toLocaleDateString('pl-PL')} 
                    <span class="w-1 h-1 bg-gray-300 rounded-full"></span> 
                    Źródło: ${g.assetName === 'ALL' ? 'Cały Portfel' : g.assetName}
                </p>
                
                <div class="flex justify-between items-end mb-2">
                    <span class="text-2xl font-bold ${isReached ? 'text-amber-500' : 'text-brand-600'}">${pct.toFixed(1)}%</span>
                    <span class="text-sm font-semibold text-gray-700">${curFmt.format(currentVal)} / ${curFmt.format(g.targetAmount)}</span>
                </div>
                <progress value="${pct}" max="100" class="w-full mb-3 ${progressClass}" ${progressStyle}></progress>
                <p class="text-xs font-medium text-gray-400 text-right">Pozostało: ${curFmt.format(remain)}</p>
            </div>`;
    });
}

// --- FORMULARZE I MODALE ---
function openTransactionModal(editId = null) {
    document.getElementById('asset-form').reset();
    const title = document.getElementById('modal-title');
    
    if (editId) {
        const r = records.find(x => x.id === editId);
        if(r) {
            title.textContent = "Edytuj Transakcję";
            document.getElementById('asset-id').value = r.id;
            document.getElementById('asset-type').value = r.type || 'Zakup';
            document.getElementById('asset-date').value = r.date;
            document.getElementById('asset-category').value = r.category;
            document.getElementById('asset-platform').value = r.platform;
            document.getElementById('asset-name').value = r.name;
            document.getElementById('asset-quantity').value = r.quantity;
            document.getElementById('asset-value').value = r.valuePln;
            document.getElementById('asset-invested').value = r.investedPln || r.valuePln;
            document.getElementById('asset-notes').value = r.notes || '';
        }
    } else {
        title.textContent = "Dodaj Transakcję";
        document.getElementById('asset-id').value = '';
        document.getElementById('asset-date').valueAsDate = new Date();
    }

    const m = document.getElementById('asset-modal');
    m.classList.remove('hidden');
    setTimeout(() => m.classList.remove('opacity-0'), 10);
}

function openGoalModal() {
    document.getElementById('goal-form').reset();
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-modal-title').textContent = "Dodaj Cel Finansowy";
    const m = document.getElementById('goal-modal');
    m.classList.remove('hidden');
    setTimeout(() => m.classList.remove('opacity-0'), 10);
}

function closeModals() {
    ['asset-modal', 'goal-modal', 'asset-details-modal'].forEach(id => {
        const m = document.getElementById(id);
        m.classList.add('opacity-0');
        setTimeout(() => m.classList.add('hidden'), 300);
    });
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('asset-id').value || crypto.randomUUID();
    const type = document.getElementById('asset-type').value;
    const date = document.getElementById('asset-date').value;
    const category = document.getElementById('asset-category').value;
    const platform = document.getElementById('asset-platform').value;
    const name = document.getElementById('asset-name').value;
    const quantity = parseFloat(document.getElementById('asset-quantity').value.replace(',', '.'));
    const valuePln = parseFloat(document.getElementById('asset-value').value.replace(',', '.'));
    const invInput = document.getElementById('asset-invested').value;
    const investedPln = invInput ? parseFloat(invInput.replace(',', '.')) : valuePln;
    const notes = document.getElementById('asset-notes').value;

    const isEdit = records.some(r => r.id === id);
    records = records.filter(r => r.id !== id);
    records.push({ id, type, date, category, platform, name, quantity, valuePln, investedPln, notes });

    closeModals();
    renderAll();
    showToast(isEdit ? "Transakcja zaktualizowana!" : "Transakcja zapisana!");
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('goal-id').value;
    const id = idInput || crypto.randomUUID();
    const name = document.getElementById('goal-name').value;
    const targetAmount = parseFloat(document.getElementById('goal-amount').value);
    const assetName = document.getElementById('goal-asset').value;
    const targetDate = document.getElementById('goal-date').value;

    const isEdit = goals.some(g => g.id === id);
    goals = goals.filter(g => g.id !== id);
    goals.push({ id, name, targetAmount, assetName, targetDate });
    
    closeModals();
    renderAll();
    showToast(isEdit ? "Cel zaktualizowany!" : "Cel dodany!");
}

function editRecord(id) { openTransactionModal(id); }
function deleteRecord(id) { if(confirm('Usunąć ten wpis?')) { records = records.filter(r => r.id !== id); renderAll(); showToast("Usunięto"); } }

function editGoal(id) {
    const g = goals.find(x => x.id === id);
    if (g) {
        document.getElementById('goal-form').reset();
        document.getElementById('goal-modal-title').textContent = "Edytuj Cel";
        document.getElementById('goal-id').value = g.id;
        document.getElementById('goal-name').value = g.name;
        document.getElementById('goal-amount').value = g.targetAmount;
        
        populateGoalAssetSelect();
        
        document.getElementById('goal-asset').value = g.assetName;
        document.getElementById('goal-date').value = g.targetDate;
        
        const m = document.getElementById('goal-modal');
        m.classList.remove('hidden');
        setTimeout(() => m.classList.remove('opacity-0'), 10);
    }
}
function deleteGoal(id) { if(confirm('Usunąć ten cel?')) { goals = goals.filter(g => g.id !== id); renderAll(); showToast("Usunięto cel"); } }

// --- EXPORT / IMPORT ---
function exportData() {
    const data = { transactions: records, goals: goals };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.createElement('a'); a.href = dataStr; a.download = `MoChart_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast("Zapisano na dysku!");
}

function handleImport(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            let imported = JSON.parse(evt.target.result);
            if(Array.isArray(imported)) { records = imported; goals = []; } 
            else { records = imported.transactions || []; goals = imported.goals || []; }
            
            records = records.map(r => ({ ...r, type: r.type || 'Zakup', notes: r.notes || '' }));
            renderAll(); showToast("Wczytano plik!");
        } catch(err) { showToast("Błąd odczytu JSON.", "error"); }
        document.getElementById('file-import').value = ''; 
    };
    reader.readAsText(file);
}