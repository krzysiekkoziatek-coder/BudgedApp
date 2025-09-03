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
    let isEditing = false; // Flaga zapobiegająca wielokrotnej edycji

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

    // --- GŁÓWNA LOGIKA RENDEROWANIA ---
    const render = () => {
        isEditing = false; // Resetuj flagę edycji przy każdym renderowaniu
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
    
    const renderYearlyTable = () => {
        tableHead.innerHTML = `<tr><th>Kat.</th>${MONTHS.map(m => `<th>${m.substring(0,3)}</th>`).join('')}<th>Suma</th></tr>`;
        const year = currentDate.getFullYear();
        const yearExpenses = expenses.filter(e => e.date.startsWith(year));
        const categories = [...new Set(yearExpenses.map(e => e.category))];
        let bodyHtml = categories.map(cat => {
            let categoryTotal = 0;
            const monthlySums = Array(12).fill(0).map((_, i) => {
                const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
                const sum = yearExpenses.filter(e => e.category === cat && e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
                categoryTotal += sum;
                return `<td>${sum > 0 ? formatCurrency(sum) : '-'}</td>`;
            }).join('');
            return `<tr><td>${cat}</td>${monthlySums}<td><strong>${formatCurrency(categoryTotal)}</strong></td></tr>`;
        }).join('');
        let grandTotal = 0;
        const totalSums = Array(12).fill(0).map((_, i) => {
            const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
            const total = yearExpenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
            grandTotal += total;
            return `<td>${formatCurrency(total)}</td>`;
        }).join('');
        bodyHtml += `<tr style="font-weight: bold; border-top: 2px solid var(--text-color);"><td><strong>SUMA</strong></td>${totalSums}<td>${formatCurrency(grandTotal)}</td></tr>`;
        tableBody.innerHTML = bodyHtml;
        if(categories.length === 0) tableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 2rem;">Brak wydatków.</td></tr>`;
    };

    const renderCloseMonthButton = () => {
        const monthKey = getKeyForDate(currentDate);
        if (closedMonths[monthKey]) {
            closeMonthBtn.textContent = 'Otwórz miesiąc';
            closeMonthBtn.onclick = () => {
                delete closedMonths[monthKey];
                const nextMonthDate = new Date(currentDate);
                nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                const nextMonthKey = getKeyForDate(nextMonthDate);
                delete savingsForward[nextMonthKey];
                saveData();
                render();
            };
        } else {
            closeMonthBtn.textContent = 'Zamknij miesiąc';
            closeMonthBtn.onclick = () => closeMonthPrompt.classList.toggle('hidden');
        }
    };
    
    const renderDashboardView = () => {
        if(window.pieChartInstance) window.pieChartInstance.destroy();
        if(window.barChartInstance) window.barChartInstance.destroy();

        populateDashboardSelectors();

        const isYearly = dashboardDisplayMode === 'yearly';
        const year = dashboardDate.getFullYear();
        
        let filteredExpenses, previousPeriodExpenses;
        let totalIncome = 0;
        
        if (isYearly) {
            const yearStr = String(year);
            filteredExpenses = expenses.filter(e => e.date.startsWith(yearStr));
            previousPeriodExpenses = expenses.filter(e => e.date.startsWith(String(year - 1)));
            totalIncome = Object.entries(incomes).filter(([k]) => k.startsWith(yearStr)).reduce((s, [,v]) => s + v, 0) + 
                          Object.entries(savingsForward).filter(([k]) => k.startsWith(yearStr)).reduce((s, [,v]) => s + v, 0);
        } else {
            const monthKey = getKeyForDate(dashboardDate);
            filteredExpenses = expenses.filter(e => e.date.startsWith(monthKey));
            const prevDate = new Date(dashboardDate);
            prevDate.setMonth(prevDate.getMonth() - 1);
            const prevMonthKey = getKeyForDate(prevDate);
            previousPeriodExpenses = expenses.filter(e => e.date.startsWith(prevMonthKey));
            totalIncome = (incomes[monthKey] || 0) + (savingsForward[monthKey] || 0);
        }
        
        const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
        const balance = totalIncome - totalExpenses;
        document.getElementById('kpi-total-income').textContent = formatCurrency(totalIncome);
        document.getElementById('kpi-total-expenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('kpi-balance').textContent = formatCurrency(balance);
        document.getElementById('kpi-balance').style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        const totalPreviousExpenses = previousPeriodExpenses.reduce((s, e) => s + e.amount, 0);
        const comparisonEl = document.getElementById('kpi-comparison');
        document.getElementById('kpi-comparison-label').textContent = isYearly ? "Porównanie wydatków z pop. rokiem" : "Porównanie wydatków z pop. miesiąca";

        if (totalPreviousExpenses > 0) {
            const diff = totalExpenses - totalPreviousExpenses;
            comparisonEl.textContent = formatCurrency(diff, 'exceptZero');
            comparisonEl.style.color = diff > 0 ? 'var(--danger-color)' : 'var(--success-color)';
        } else {
            comparisonEl.textContent = "N/A";
            comparisonEl.style.color = 'var(--text-color)';
        }
        
        const categorySpending = filteredExpenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});
        
        const sortedCategories = Object.entries(categorySpending).sort(([,a],[,b]) => b - a);
        const categorySummaryTable = document.getElementById('category-summary-table');
        categorySummaryTable.innerHTML = sortedCategories.map(([cat, amount]) => `
            <tr>
                <td>${cat}</td>
                <td style="text-align: right;">${formatCurrency(amount)}</td>
            </tr>
        `).join('');
        if (sortedCategories.length === 0) categorySummaryTable.innerHTML = `<tr><td colspan="2">Brak danych.</td></tr>`;

        const expenseSummaryTable = document.getElementById('expense-summary-table');
        const sortedExpenses = [...filteredExpenses].sort((a,b) => b.amount - a.amount);
        expenseSummaryTable.innerHTML = sortedExpenses.map(exp => `
             <tr>
                <td>${exp.description}</td>
                <td style="text-align: right;">${formatCurrency(exp.amount)}</td>
            </tr>
        `).join('');
        if (sortedExpenses.length === 0) expenseSummaryTable.innerHTML = `<tr><td colspan="2">Brak wydatków.</td></tr>`;

        const computedStyles = getComputedStyle(appBody);
        const chartTextColor = computedStyles.getPropertyValue('--text-color').trim();
        const chartGridColor = computedStyles.getPropertyValue('--border-color').trim();
        const accentColor = computedStyles.getPropertyValue('--accent-color').trim();
        const accentColorTransparent = accentColor + '80';

        const pieCtx = document.getElementById('category-pie-chart').getContext('2d');
        window.pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: sortedCategories.map(([cat]) => cat),
                datasets: [{
                    data: sortedCategories.map(([, amount]) => amount),
                    backgroundColor: ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f97316', '#eab308', '#64748b', '#ef4444', '#14b8a6'],
                    borderColor: computedStyles.getPropertyValue('--card-bg-color').trim(),
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: chartTextColor, padding: 15 } }
                },
                cutout: '60%'
            }
        });

        const barCtx = document.getElementById('history-bar-chart').getContext('2d');
        let barLabels, barData;
        document.getElementById('bar-chart-title').textContent = isYearly ? "Wydatki w ciągu roku" : "Największe wydatki w miesiącu";

        if (isYearly) {
            barLabels = MONTHS;
            barData = MONTHS.map((_, i) => {
                const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
                return filteredExpenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
            });
        } else {
            const topExpenses = filteredExpenses.sort((a,b) => b.amount - a.amount).slice(0, 10);
            barLabels = topExpenses.map(e => e.description.length > 15 ? e.description.substring(0, 12)+'...' : e.description);
            barData = topExpenses.map(e => e.amount);
        }
        
        const barGradient = barCtx.createLinearGradient(0, 0, 0, barCtx.canvas.height);
        barGradient.addColorStop(0, accentColor);
        barGradient.addColorStop(1, accentColorTransparent);

        window.barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: 'Suma wydatków',
                    data: barData,
                    backgroundColor: barGradient,
                    borderColor: accentColor,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                    x: { ticks: { color: chartTextColor }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };

    const populateDashboardSelectors = () => {
        const yearSelect = document.getElementById('dashboard-year-select');
        const monthSelect = document.getElementById('dashboard-month-select');
        const yearsWithData = [...new Set(expenses.map(e => e.date.substring(0, 4)))];
        const currentYear = new Date().getFullYear();
        if (!yearsWithData.includes(String(currentYear))) yearsWithData.push(String(currentYear));
        yearsWithData.sort((a, b) => b - a);
        yearSelect.innerHTML = yearsWithData.map(y => `<option value="${y}" ${y == dashboardDate.getFullYear() ? 'selected' : ''}>${y}</option>`).join('');
        monthSelect.innerHTML = MONTHS.map((m, i) => `<option value="${i}" ${i == dashboardDate.getMonth() ? 'selected' : ''}>${m}</option>`).join('');
        monthSelect.style.display = dashboardDisplayMode === 'monthly' ? 'block' : 'none';
    };

    // --- LOGIKA EDYCJI ---
    const handleEdit = (target) => {
        if (isEditing) return;
        isEditing = true;

        const row = target.closest('tr');
        const id = row.dataset.id;
        const expense = expenses.find(exp => String(exp.id) === id);
        if (!expense) { isEditing = false; return; }

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
            if(field === 'amount') input.step = '0.01';
            input.value = originalValue;
        }

        target.style.display = 'none';
        target.parentNode.insertBefore(input, target.nextSibling);
        input.focus();

        const saveChange = () => {
            let newValue = input.value;
            if (field === 'amount') newValue = parseFloat(newValue) || 0;
            expense[field] = newValue;
            saveData();
            render(); 
        };
        
        input.addEventListener('blur', saveChange);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.remove();
                target.style.display = '';
                isEditing = false;
            }
        });
    };

    // --- OBSŁUGA ZDARZEŃ ---
    navBudgetBtn.addEventListener('click', () => { activeTab = 'budget'; navBudgetBtn.classList.add('active'); navDashboardBtn.classList.remove('active'); render(); });
    navDashboardBtn.addEventListener('click', () => { activeTab = 'dashboard'; navDashboardBtn.classList.add('active'); navBudgetBtn.classList.remove('active'); render(); });
    document.getElementById('monthly-view-btn').addEventListener('click', () => { currentView = 'monthly'; document.getElementById('monthly-view-btn').classList.add('active'); document.getElementById('yearly-view-btn').classList.remove('active'); render(); });
    document.getElementById('yearly-view-btn').addEventListener('click', () => { currentView = 'yearly'; document.getElementById('yearly-view-btn').classList.add('active'); document.getElementById('monthly-view-btn').classList.remove('active'); render(); });
    
    const navigateDate = (dir) => {
        if (currentView === 'monthly') currentDate.setMonth(currentDate.getMonth() + dir);
        else currentDate.setFullYear(currentDate.getFullYear() + dir);
        render();
    };
    document.getElementById('prev-date-btn').addEventListener('click', () => navigateDate(-1));
    document.getElementById('next-date-btn').addEventListener('click', () => navigateDate(1));
    
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

    document.getElementById('copy-expenses-btn').addEventListener('click', () => {
        const prevMonthDate = new Date(currentDate); prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthKey = getKeyForDate(prevMonthDate); const currentMonthKey = getKeyForDate(currentDate);
        const prevMonthExpenses = expenses.filter(e => e.date.startsWith(prevMonthKey));
        if (prevMonthExpenses.length > 0) {
            prevMonthExpenses.forEach(exp => expenses.push({ ...exp, id: crypto.randomUUID(), date: exp.date.replace(prevMonthKey, currentMonthKey), paid: false }));
            saveData(); render();
        }
    });
    
    const cancelLongPress = () => clearTimeout(longPressTimer);

    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach(evt => tableBody.addEventListener(evt, cancelLongPress));

    tableBody.addEventListener('mousedown', (e) => {
        if (isEditing || e.target.closest('input, select')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;
        longPressTimer = setTimeout(() => {
            if (confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
                expenses = expenses.filter(exp => String(exp.id) !== row.dataset.id);
                saveData();
                render();
            }
        }, 500);
    });
    
    tableBody.addEventListener('touchstart', (e) => {
        if (isEditing || e.target.closest('input, select')) return;
        const row = e.target.closest('tr.expense-row');
        if (!row) return;
        longPressTimer = setTimeout(() => {
            if (confirm('Czy na pewno chcesz usunąć ten wydatek?')) {
                expenses = expenses.filter(exp => String(exp.id) !== row.dataset.id);
                saveData();
                render();
            }
        }, 500);
    });

    tableBody.addEventListener('click', (e) => {
        cancelLongPress(); // Anuluj długie przytrzymanie, jeśli to było tylko kliknięcie
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
    
    const savingsAmountInput = document.getElementById('savings-amount');
    const saveSavingsBtn = document.getElementById('save-savings-yes');
    savingsAmountInput.addEventListener('input', () => { saveSavingsBtn.disabled = !savingsAmountInput.value || parseFloat(savingsAmountInput.value) < 0; });
    saveSavingsBtn.addEventListener('click', () => {
        const amount = parseFloat(savingsAmountInput.value);
        const currentMonthKey = getKeyForDate(currentDate);
        const nextMonthDate = new Date(currentDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextMonthKey = getKeyForDate(nextMonthDate);
        savingsForward[nextMonthKey] = amount;
        closedMonths[currentMonthKey] = true;
        saveData();
        closeMonthPrompt.classList.add('hidden');
        savingsAmountInput.value = '';
        saveSavingsBtn.disabled = true;
        render();
    });
    document.getElementById('save-savings-no').addEventListener('click', () => { closeMonthPrompt.classList.add('hidden'); savingsAmountInput.value = ''; saveSavingsBtn.disabled = true; });
    
    const dashboardMonthSelect = document.getElementById('dashboard-month-select');
    const dashboardYearSelect = document.getElementById('dashboard-year-select');
    dashboardMonthSelect.addEventListener('change', (e) => { dashboardDate.setMonth(parseInt(e.target.value)); renderDashboardView(); });
    dashboardYearSelect.addEventListener('change', (e) => { dashboardDate.setFullYear(parseInt(e.target.value)); renderDashboardView(); });
    document.getElementById('dashboard-monthly-btn').addEventListener('click', () => { dashboardDisplayMode = 'monthly'; document.getElementById('dashboard-monthly-btn').classList.add('active'); document.getElementById('dashboard-yearly-btn').classList.remove('active'); renderDashboardView(); });
    document.getElementById('dashboard-yearly-btn').addEventListener('click', () => { dashboardDisplayMode = 'yearly'; document.getElementById('dashboard-yearly-btn').classList.add('active'); document.getElementById('dashboard-monthly-btn').classList.remove('active'); renderDashboardView(); });

    const applyTheme = (theme) => {
        appBody.setAttribute('data-theme', theme);
        localStorage.setItem('budgetAppTheme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
        if (activeTab === 'dashboard') {
            setTimeout(renderDashboardView, 300);
        }
    };
    
    themeSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-btn')) {
            applyTheme(e.target.dataset.theme);
        }
    });
    
    const init = () => {
        const savedTheme = localStorage.getItem('budgetAppTheme') || 'cyber';
        applyTheme(savedTheme);
        loadData();
        render();
    };

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(reg => console.log('SW registered!', reg)).catch(err => console.log('SW registration failed: ', err));
        });
    }

    init();
});

