document.addEventListener('DOMContentLoaded', () => {
    // --- STAN APLIKACJI ---
    let expenses = [];
    let incomes = {};
    let closedMonths = {}; // { 'YYYY-MM': true }
    let savingsForward = {}; // { 'YYYY-MM': amount }
    let currentDate = new Date();
    let currentView = 'monthly';
    let activeTab = 'budget';
    let dashboardDate = new Date();
    let dashboardDisplayMode = 'monthly';

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
    const saveData = () => {
        localStorage.setItem('budgetAppData', JSON.stringify({ expenses, incomes, closedMonths, savingsForward }));
    };
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
    
    // --- RENDEROWANIE WIDOKU BUDŻETU ---
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
        tableHead.parentElement.classList.remove('yearly-table');
        document.getElementById('copy-expenses-btn').style.display = 'inline-block';
        tableHead.innerHTML = `<tr><th>Opis</th><th>Kwota</th><th>Kategoria</th><th>Data</th><th>Opłacone</th><th class="actions">Akcje</th></tr>`;
        
        const monthKey = getKeyForDate(currentDate);
        const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey)).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        tableBody.innerHTML = monthExpenses.map(expense => `
            <tr data-id="${expense.id}">
                <td data-field="description">${expense.description}</td> <td data-field="amount">${formatCurrency(expense.amount)}</td>
                <td data-field="category">${expense.category}</td> <td data-field="date">${expense.date}</td>
                <td data-field="paid"><input type="checkbox" ${expense.paid ? 'checked' : ''}></td>
                <td class="actions"><button class="icon-btn delete-btn">🗑️</button></td>
            </tr>`).join('');
        if (monthExpenses.length === 0) tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Brak wydatków.</td></tr>`;
    };
    
    const renderYearlyTable = () => {
        tableHead.parentElement.classList.add('yearly-table');
        document.getElementById('copy-expenses-btn').style.display = 'none';
        const year = currentDate.getFullYear();
        const yearExpenses = expenses.filter(e => e.date.startsWith(year));
        const categories = [...new Set(yearExpenses.map(e => e.category))];
        
        tableHead.innerHTML = `<tr><th>Kat.</th>${MONTHS.map(m => `<th>${m.substring(0,3)}</th>`).join('')}<th>Suma</th></tr>`;

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
    
    // --- RENDEROWANIE WIDOKU DASHBOARDU ---
    let pieChartInstance, barChartInstance;
    const renderDashboardView = () => {
        if(pieChartInstance) pieChartInstance.destroy();
        if(barChartInstance) barChartInstance.destroy();

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
        
        // KPIs
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
        
        // Tabela: Podsumowanie Kategorii
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

        // Tabela: Podsumowanie Wydatków
        const expenseSummaryTable = document.getElementById('expense-summary-table');
        const sortedExpenses = [...filteredExpenses].sort((a,b) => b.amount - a.amount);
        expenseSummaryTable.innerHTML = sortedExpenses.map(exp => `
             <tr>
                <td>${exp.description}</td>
                <td style="text-align: right;">${formatCurrency(exp.amount)}</td>
            </tr>
        `).join('');
        if (sortedExpenses.length === 0) expenseSummaryTable.innerHTML = `<tr><td colspan="2">Brak wydatków.</td></tr>`;


        // Wykresy
        const computedStyles = getComputedStyle(appBody);
        const chartTextColor = computedStyles.getPropertyValue('--text-color').trim();
        const chartGridColor = computedStyles.getPropertyValue('--border-color').trim();
        const accentColor = computedStyles.getPropertyValue('--accent-color').trim();
        const accentColorTransparent = accentColor + '80'; // Add transparency

        const pieCtx = document.getElementById('category-pie-chart').getContext('2d');
        pieChartInstance = new Chart(pieCtx, {
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

        barChartInstance = new Chart(barCtx, {
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

        // Alert o niezamkniętych miesiącach
        const today = new Date();
        const todayMonthKey = getKeyForDate(today);
        const allMonthsWithData = [...new Set(expenses.map(e => e.date.substring(0, 7)))];

        const unclosedPastMonthsCount = allMonthsWithData.filter(monthKey => {
            return monthKey < todayMonthKey && !closedMonths[monthKey];
        }).length;

        if (unclosedPastMonthsCount > 0) {
            unclosedMonthsAlert.innerHTML = `
                <span style="color: var(--danger-color); font-weight: bold;">
                    Uwaga! Masz ${unclosedPastMonthsCount} niezamknięte miesiące. Zamknij je aby zobaczyć najbardziej aktualny raport.
                </span>`;
            unclosedMonthsAlert.classList.remove('hidden');
        } else {
            unclosedMonthsAlert.innerHTML = '';
            unclosedMonthsAlert.classList.add('hidden');
        }
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
            const monthKey = getKeyForDate(currentDate);
            incomes[monthKey] = parseFloat(incomeInput.value) || 0;
            saveData();
            renderBalance();
            incomeInput.blur();
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

    tableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr'); if (!row) return;
        const id = row.dataset.id;
        if (e.target.closest('.delete-btn')) { expenses = expenses.filter(exp => String(exp.id) !== id); saveData(); render(); }
        if (e.target.type === 'checkbox') { const expense = expenses.find(exp => String(exp.id) === id); if(expense) { expense.paid = e.target.checked; saveData(); renderBalance(); } }
    });
    
    tableBody.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('td');
        if (!cell || cell.classList.contains('actions') || cell.dataset.field === 'paid' || cell.querySelector('input')) return;
        const field = cell.dataset.field;
        const id = cell.closest('tr').dataset.id;
        const expense = expenses.find(exp => String(exp.id) === id);
        if (!expense) return;
        
        const input = field === 'category' ? document.createElement('select') : document.createElement('input');
        if(field === 'category') { CATEGORIES.forEach(cat => { const opt = document.createElement('option'); opt.value = opt.textContent = cat; if(cat === expense.category) opt.selected = true; input.appendChild(opt); }); }
        else { input.type = field === 'amount' ? 'number' : (field === 'date' ? 'date' : 'text'); input.value = field === 'amount' ? expense.amount : expense[field]; }
        cell.innerHTML = ''; cell.appendChild(input); input.focus();
        
        const saveEdit = () => { expense[field] = field === 'amount' ? (parseFloat(input.value) || 0) : input.value; saveData(); render(); };
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') input.blur(); });
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
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });

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

    // Rejestracja Service Workera
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    init();
});
