import { 
    initTheme, renderAll, switchTab, showToast, clearAllFilters, changePage, 
    renderHistory, openAssetDetails, openTransactionModal, openGoalModal, 
    closeModals, editRecord, deleteRecord, editGoal, deleteGoal, 
    exportData, handleImport, openSettingsModal, toggleTheme, 
    handleTransactionSubmit, handleGoalSubmit 
} from './ui.js';
import { refreshCryptoPrices } from './api.js';
import { renderCharts } from './charts.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Rejestracja Service Workera dla PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker zarejestrowany', reg))
            .catch(err => console.error('Błąd rejestracji Service Workera', err));
    }

    // 2. Inicjalizacja Dark Mode
    initTheme();

    document.getElementById('asset-form').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
    renderAll();
    
    const savedTab = sessionStorage.getItem('moChartTab');
    if(savedTab) switchTab(savedTab);
});

// Wystawienie funkcji do obiektu globalnego (aby HTML onClick/onChange działał poprawnie z modułami)
window.switchTab = switchTab;
window.refreshCryptoPrices = refreshCryptoPrices;
window.openTransactionModal = openTransactionModal;
window.openGoalModal = openGoalModal;
window.closeModals = closeModals;
window.exportData = exportData;
window.handleImport = handleImport;
window.openSettingsModal = openSettingsModal;
window.toggleTheme = toggleTheme;
window.clearAllFilters = clearAllFilters;
window.changePage = changePage;
window.renderHistory = renderHistory;
window.openAssetDetails = openAssetDetails;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.renderCharts = renderCharts;