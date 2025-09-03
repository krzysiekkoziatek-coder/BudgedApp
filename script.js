document.addEventListener('DOMContentLoaded', () => {
    // --- STAN APLIKACJI ---
    let expenses = [];
    let incomes = {};
    let closedMonths = {};
    let savingsForward = {};
    let currentDate = new Date();
    let currentView = 'monthly';
    let activeTab = 'budget';
    let dashboardDate = new Date();
    let dashboardDisplayMode = 'monthly';
    let longPressTimer;
    let isEditing = false;
    let itemToDeleteId = null;

    // --- SELEKTORY DOM ---
    const appBody = document.body;
    // ... reszta selektorów bez zmian ...
    const modal = document.getElementById('custom-confirm-modal');
    const modalText = document.getElementById('modal-text');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // ... reszta kodu bez zmian ...

    // --- NOWA FUNKCJA OKNA POTWIERDZENIA ---
    const showCustomConfirm = (message, callback) => {
        modalText.textContent = message;
        modal.classList.remove('hidden');

        const handleConfirm = () => {
            modal.classList.add('hidden');
            callback(true);
            cleanup();
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            callback(false);
            cleanup();
        };
        
        const cleanup = () => {
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            modalCancelBtn.removeEventListener('click', handleCancel);
        };

        modalConfirmBtn.addEventListener('click', handleConfirm);
        modalCancelBtn.addEventListener('click', handleCancel);
    };

    // --- OBSŁUGA ZDARZEŃ ---
    
    // ... event listenery nawigacji, formularzy, itd. bez zmian ...

    // ZMIANA W OBSŁUDZE PRZYTRZYMANIA
    const handleLongPress = (row) => {
        if (!row) return;
        itemToDeleteId = row.dataset.id;
        showCustomConfirm('Czy na pewno chcesz usunąć ten wydatek?', (result) => {
            if (result && itemToDeleteId) {
                expenses = expenses.filter(exp => String(exp.id) !== itemToDeleteId);
                saveData();
                render();
            }
            itemToDeleteId = null;
        });
    };

    tableBody.addEventListener('mousedown', (e) => {
        if (isEditing || e.target.closest('input, select')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;
        longPressTimer = setTimeout(() => handleLongPress(row), 500);
    });
    
    tableBody.addEventListener('touchstart', (e) => {
        if (isEditing || e.target.closest('input, select')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;
        longPressTimer = setTimeout(() => handleLongPress(row), 500);
    });

    // ... reszta kodu bez zmian ...
});
