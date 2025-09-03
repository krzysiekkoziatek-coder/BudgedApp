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

    // --- SELEKTORY DOM ---
    const appBody = document.body;
    const budgetView = document.getElementById('budget-view');
    const dashboardView = document.getElementById('dashboard-view');
    const navBudgetBtn = document.getElementById('nav-budget');
    const navDashboardBtn = document.getElementById('nav-dashboard');
    const tableBody = document.querySelector('#expenses-table tbody');
    const tableHead = document.querySelector('#expenses-table thead');
    const incomeInput = document.getElementById('income-input');
    const balanceValueEl = document.getElementById('balance-value');
    const plannedExpensesValueEl = document.getElementById('planned-expenses-value');
    const totalPaidValueEl = document.getElementById('total-paid-value');
    const forwardedSavingsValueEl = document.getElementById('forwarded-savings-value');
    const currentDateDisplay = document.getElementById('current-date-display');
    const expenseForm = document.getElementById('inline-expense-form');
    const closeMonthPrompt = document.getElementById('close-month-prompt');
    const closeMonthBtn = document.getElementById('close-month-btn');
    const unclosedMonthsAlert = document.getElementById('unclosed-months-alert');
    const themeSelector = document.getElementById('theme-selector');

    // --- STAŁE ---
    const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const CATEGORIES = ["Jedzenie", "Mieszkanie", "Rachunki", "Transport", "Rozrywka", "Zdrowie", "Ubrania", "Zadłużenie", "Oszczędności", "Inne"];
    
    // --- ZARZĄDZANIE DANYMI ---
    const saveData = () => localStorage.setItem('budgetAppData', JSON.stringify({ expenses, incomes, closedMonths, savingsForward }));
    const loadData = () => {
        const data = JSON.parse(localStorage.getItem('budgetAppData'));
        if (data) {
            expenses = data.expenses || [];
            incomes = data.incomes || {};
            closedMonths = data.closedMonths || {};
            savingsForward = data.savingsForward || {};
        }
    };
    
    // --- FORMATOWANIE ---
    const formatCurrency = (amount, signDisplay = 'auto') => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', signDisplay }).format(amount || 0);
    const getKeyForDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // --- RENDEROWANIE ---
    const render = () => {
        if (activeTab === 'budget') {
            budgetView.style.display = 'block';
            dashboardView.style.display = 'none';
            renderBudgetView();
        } else {
            budgetView.style.display = 'none';
            dashboardView.style.display = 'block';
            renderDashboardView();
        }
        updateDateDisplay();
    };
    
    const renderBudgetView = () => {
        renderBalance();
        renderCloseMonthButton();
        if (currentView === 'monthly') renderMonthlyTable();
        else renderYearlyTable();
    };
    
    const updateDateDisplay = () => {
         if (currentView === 'monthly') currentDateDisplay.textContent = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
         else currentDateDisplay.textContent = currentDate.getFullYear();
    };
    
    const renderBalance = () => {
        const monthKey = getKeyForDate(currentDate);
        const forwardedSavings = savingsForward[monthKey] || 0;
        const currentIncome = incomes[monthKey] || 0;
        const totalIncome = currentIncome + forwardedSavings;
        const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey));
        const totalPaid = monthExpenses.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const actualBalance = totalIncome - totalExpenses;
        
        incomeInput.value = currentIncome > 0 ? currentIncome : '';
        forwardedSavingsValueEl.textContent = formatCurrency(forwardedSavings);
        balanceValueEl.textContent = formatCurrency(actualBalance);
        balanceValueEl.className = `value ${actualBalance >= 0 ? 'positive' : 'negative'}`;
        plannedExpensesValueEl.textContent = formatCurrency(totalExpenses);
        totalPaidValueEl.textContent = formatCurrency(totalPaid);
    };
    
    const renderMonthlyTable = () => {
        tableHead.innerHTML = `<tr><th>Opis</th><th>Kwota</th><th>Kategoria</th><th>Data</th><th>Opłacone</th></tr>`;
        const monthKey = getKeyForDate(currentDate);
        const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey)).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        tableBody.innerHTML = monthExpenses.map(expense => `
            <tr data-id="${expense.id}" class="expense-row">
                <td class="expense-cell">
                    <div class="expense-wrapper">
                        <div class="expense-info">
                            <div class="expense-main">
                                <span class="expense-description editable" data-field="description">${expense.description}</span>
                                <span class="expense-amount editable" data-field="amount">${formatCurrency(expense.amount)}</span>
                            </div>
                            <div class="expense-details">
                                <span class="expense-category editable" data-field="category">${expense.category}</span>
                                <span class="expense-date editable" data-field="date">${expense.date}</span>
                            </div>
                        </div>
                        <div class="expense-actions">
                            <input type="checkbox" ${expense.paid ? 'checked' : ''}>
                        </div>
                    </div>
                </td>
            </tr>`).join('');
            
        if (monthExpenses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Brak wydatków.</td></tr>`;
        }
    };
    
    const renderYearlyTable = () => { /* ... bez zmian ... */ };

    const renderCloseMonthButton = () => { /* ... bez zmian ... */ };
    
    const renderDashboardView = () => { /* ... bez zmian ... */ };
    const populateDashboardSelectors = () => { /* ... bez zmian ... */ };

    // --- LOGIKA EDYCJI I USUWANIA ---
    const handleEdit = (target) => {
        if (isEditing) return;
        isEditing = true;

        const row = target.closest('tr');
        const id = row.dataset.id;
        const expense = expenses.find(exp => String(exp.id) === id);
        const field = target.dataset.field;
        const originalValue = (field === 'amount') ? expense.amount : expense[field];
        
        let input;
        if (field === 'category') {
            input = document.createElement('select');
            CATEGORIES.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = cat;
                if (cat === originalValue) opt.selected = true;
                input.appendChild(opt);
            });
        } else {
            input = document.createElement('input');
            input.type = (field === 'amount') ? 'number' : (field === 'date' ? 'date' : 'text');
            input.value = originalValue;
        }

        target.replaceWith(input);
        input.focus();

        const saveChange = () => {
            let newValue = input.value;
            if (field === 'amount') newValue = parseFloat(newValue) || 0;
            expense[field] = newValue;
            saveData();
            render();
            isEditing = false;
        };
        
        input.addEventListener('blur', saveChange);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.replaceWith(target);
                isEditing = false;
            }
        });
    };

    // --- OBSŁUGA ZDARZEŃ ---
    navBudgetBtn.addEventListener('click', () => { activeTab = 'budget'; navBudgetBtn.classList.add('active'); navDashboardBtn.classList.remove('active'); render(); });
    navDashboardBtn.addEventListener('click', () => { activeTab = 'dashboard'; navDashboardBtn.classList.add('active'); navBudgetBtn.classList.remove('active'); render(); });
    // ... reszta event listenerów nawigacji ...
    
    incomeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            incomes[getKeyForDate(currentDate)] = parseFloat(e.target.value) || 0;
            saveData();
            renderBalance();
            e.target.blur();
        }
    });
    
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        expenses.push({ id: crypto.randomUUID(), description: document.getElementById('expense-description').value, amount: parseFloat(document.getElementById('expense-amount').value), category: document.getElementById('expense-category').value, date: `${getKeyForDate(currentDate)}-${String(new Date().getDate()).padStart(2, '0')}`, paid: false });
        saveData(); render(); expenseForm.reset();
    });
    
    // NOWE EVENT LISTENERY DLA TABELI
    tableBody.addEventListener('mousedown', (e) => {
        if (e.target.closest('input, select, button')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;

        longPressTimer = setTimeout(() => {
            if (confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
                const id = row.dataset.id;
                expenses = expenses.filter(exp => String(exp.id) !== id);
                saveData();
                render();
            }
        }, 500); // 500ms = 0.5s
    });

    const cancelLongPress = () => clearTimeout(longPressTimer);
    tableBody.addEventListener('mouseup', cancelLongPress);
    tableBody.addEventListener('mouseout', cancelLongPress);
    tableBody.addEventListener('touchstart', (e) => {
        if (e.target.closest('input, select, button')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;

        longPressTimer = setTimeout(() => {
            if (confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
                const id = row.dataset.id;
                expenses = expenses.filter(exp => String(exp.id) !== id);
                saveData();
                render();
            }
        }, 500);
    });
    tableBody.addEventListener('touchend', cancelLongPress);
    tableBody.addEventListener('touchmove', cancelLongPress);

    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('editable')) {
            handleEdit(e.target);
        }
        if (e.target.type === 'checkbox') {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const expense = expenses.find(exp => String(exp.id) === id);
            if(expense) {
                expense.paid = e.target.checked;
                saveData();
                renderBalance();
            }
        }
    });
    
    // ... reszta starych event listenerów ...
    
    const init = () => {
        const savedTheme = localStorage.getItem('budgetAppTheme') || 'cyber';
        applyTheme(savedTheme);
        loadData();
        render();
    };

    init();
});
