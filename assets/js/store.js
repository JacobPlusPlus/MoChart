export let records = JSON.parse(localStorage.getItem('moChartTxs')) || [];
export let goals = JSON.parse(localStorage.getItem('moChartGoals')) || [];
export let livePrices = {};

// Kompatybilność wsteczna przy inicjalizacji
records = records.map(r => ({ ...r, type: r.type || 'Zakup', notes: r.notes || '' }));

export function setRecords(newRecords) {
    records = newRecords;
    localStorage.setItem('moChartTxs', JSON.stringify(records));
}

export function setGoals(newGoals) {
    goals = newGoals;
    localStorage.setItem('moChartGoals', JSON.stringify(goals));
}

export function setLivePrices(newPrices) {
    livePrices = newPrices;
}

export function getAggregatedPortfolio() {
    const portfolio = {};
    records.forEach(r => {
        const key = r.name;
        if(!portfolio[key]) portfolio[key] = { name: r.name, category: r.category, qty: 0, value: 0, invested: 0 };
        
        const factor = r.type === 'Sprzedaż' ? -1 : 1;
        portfolio[key].qty += Number(r.quantity) * factor;
        portfolio[key].value += Number(r.valuePln) * factor;
        portfolio[key].invested += Number(r.investedPln || r.valuePln) * factor;
    });
    
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