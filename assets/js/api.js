import { setLivePrices } from './store.js';
import { showToast, renderAll } from './ui.js';

export async function refreshCryptoPrices() {
    const spinIcons = document.querySelectorAll('.ph-arrows-clockwise');
    spinIcons.forEach(i => i.classList.add('animate-spin'));

    try {
        showToast("Pobieranie cen...", "info");

        const fetchTicker = sym => fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`).then(r=>r.json()).catch(()=>null);

        const [btc, eth, xrp, bnb, usd] = await Promise.all([
            fetchTicker('BTCUSDT'), fetchTicker('ETHUSDT'), fetchTicker('XRPUSDT'), fetchTicker('BNBUSDT'),
            fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).catch(()=>null)
        ]);

        const usdPln = usd?.rates?.PLN || 4.0;
        const newPrices = {};
        if(btc) newPrices['Bitcoin'] = Number(btc.price) * usdPln;
        if(eth) newPrices['Ethereum'] = Number(eth.price) * usdPln;
        if(xrp) newPrices['XRP'] = Number(xrp.price) * usdPln;
        if(bnb) newPrices['BNB'] = Number(bnb.price) * usdPln;

        const metals = await fetch('https://api.gold-api.com/price/XAU,XAG').then(r=>r.json()).catch(()=>null);

        if(metals && metals.XAU && metals.XAG) {
            newPrices['Złoto'] = metals.XAU.price * usdPln;
            newPrices['Srebro'] = metals.XAG.price * usdPln;
        }

        const now = new Date();
        document.getElementById('last-price-update').innerText = `Ceny z: ${now.toLocaleTimeString('pl-PL')}`;
        
        setLivePrices(newPrices);
        renderAll();
        showToast("Ceny zaktualizowane!", "success");
    } catch (e) {
        showToast("Błąd połączenia", "error");
    } finally {
        spinIcons.forEach(i => i.classList.remove('animate-spin'));
    }
}