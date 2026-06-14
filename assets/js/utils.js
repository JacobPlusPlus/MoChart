export const CATEGORIES = {
    'Kryptowaluty': { icon: 'ph-currency-btc', color: '#8b5cf6', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    'ETF': { icon: 'ph-trend-up', color: '#3b82f6', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    'Surowce': { icon: 'ph-cube', color: '#94a3b8', bgColor: 'bg-slate-100', iconColor: 'text-slate-600' },
    'Obligacje': { icon: 'ph-scroll', color: '#f59e0b', bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
    'Gotówka': { icon: 'ph-money', color: '#10b981', bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' }
};

export const CRYPTO_ICONS = {
    'Bitcoin':  'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
    'Ethereum': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    'XRP':      'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
    'BNB':      'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
    'USDC':     'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    'USDT':     'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    'Solana':   'https://cryptologos.cc/logos/solana-sol-logo.svg',
};

export const CHART_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const curFmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
export const numFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 6 });

export function getAssetIconHTML(name, category, catCfg, sizeClass = 'w-10 h-10') {
    if (category === 'Kryptowaluty' && CRYPTO_ICONS[name]) {
        return `<img src="${CRYPTO_ICONS[name]}" class="${sizeClass} rounded-full object-contain bg-gray-900 p-1 flex-shrink-0" onerror="this.outerHTML='<div class=\\'${sizeClass} rounded-full ${catCfg.bgColor} flex items-center justify-center ${catCfg.iconColor} flex-shrink-0\\'><i class=\\'ph-fill ph-currency-btc text-xl\\'></i></div>'">`;
    }
    return `<div class="${sizeClass} rounded-full ${catCfg.bgColor} flex items-center justify-center ${catCfg.iconColor} flex-shrink-0"><i class="ph-fill ${catCfg.icon} text-xl"></i></div>`;
}