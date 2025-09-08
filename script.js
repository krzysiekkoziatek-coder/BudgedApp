document.addEventListener('DOMContentLoaded', () => {
    // SELEKTORY AUTORYZACJI I MODALI
    const authContainer = document.getElementById('auth-container');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const authError = document.getElementById('auth-error');
    const userEmailDisplay = document.getElementById('user-email-display');
    const categoryModal = document.getElementById('category-modal');
    const newCategoryNameInput = document.getElementById('new-category-name');
    const saveCategoryBtn = document.getElementById('save-category-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalCategoryList = document.getElementById('modal-category-list');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const navTodoBtn = document.getElementById('nav-todo');
    const todoView = document.getElementById('todo-view');
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const todoDateInput = document.getElementById('todo-date-input');
    const todoDateDisplay = document.getElementById('todo-date-display');
    const navCalendarBtn = document.getElementById('nav-calendar');
    const calendarView = document.getElementById('calendar-view');
    const calendarEl = document.getElementById('calendar');
    const eventModal = document.getElementById('event-modal');
    const eventModalTitle = document.getElementById('event-modal-title');
    const eventTitleInput = document.getElementById('event-title-input');
    const eventStartDateInput = document.getElementById('event-start-date-input');
    const eventStartTimeInput = document.getElementById('event-start-time-input');
    const eventEndDateInput = document.getElementById('event-end-date-input');
    const eventEndTimeInput = document.getElementById('event-end-time-input');
    const saveEventBtn = document.getElementById('save-event-btn');
    const closeEventModalBtn = document.getElementById('close-event-modal-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');

    // STAN APLIKACJI
    let expenses = [], incomes = {}, closedMonths = {}, savingsForward = {}, userCategories = [];
    let currentDate = new Date(), currentView = 'monthly', activeTab = 'budget', dashboardDate = new Date(), dashboardDisplayMode = 'monthly';
    let longPressTimer, isEditing = false, currentUserId = null, unsubscribe, unsubscribeTodos, unsubscribeEvents;
    let itemToDelete = { type: null, data: null };
    let todosCache = [];
    let calendar = null;
    let selectedEvent = null;

    // SELEKTORY DOM
    const appBody = document.body;
    const appContainer = document.getElementById('app-container');
    const expenseCategorySelect = document.getElementById('expense-category');
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
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
    const themeSelector = document.getElementById('theme-selector');

    // STAŁE
    const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const DEFAULT_CATEGORIES = ["Jedzenie", "Mieszkanie", "Rachunki", "Transport", "Rozrywka", "Zdrowie", "Ubrania", "Zadłużenie", "Oszczędności", "Inne"];

    // LOGIKA FIREBASE
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            userEmailDisplay.textContent = user.email;
            loadDataFromFirestore();
            loadTodosFromFirestore();
        } else {
            currentUserId = null;
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (unsubscribe) unsubscribe();
            if (unsubscribeTodos) unsubscribeTodos();
            if (unsubscribeEvents) unsubscribeEvents();
            if(calendar) { calendar.destroy(); calendar = null; }
            resetLocalState();
        }
    });

    const loadDataFromFirestore = () => {
        if (!currentUserId) return;
        unsubscribe = db.collection('users').doc(currentUserId).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                expenses = data.expenses || [];
                incomes = data.incomes || {};
                closedMonths = data.closedMonths || {};
                savingsForward = data.savingsForward || {};
                userCategories = data.userCategories || [];
            } else {
                resetLocalState();
                db.collection('users').doc(currentUserId).set({ userCategories: [] });
            }
            render();
        });
    };

    const loadTodosFromFirestore = () => {
        if (!currentUserId) return;
        unsubscribeTodos = db.collection('users').doc(currentUserId).collection('todos')
            .orderBy('order', 'asc')
            .onSnapshot(querySnapshot => {
                todosCache = [];
                querySnapshot.forEach(doc => {
                    todosCache.push({ id: doc.id, ...doc.data() });
                });
                renderTodoList(todosCache);
            });
    };

    const saveDataToFirestore = () => {
        if (!currentUserId) return;
        const dataToSave = { expenses, incomes, closedMonths, savingsForward, userCategories };
        db.collection('users').doc(currentUserId).set(dataToSave, { merge: true }).catch(error => console.error("Błąd zapisu: ", error));
    };

    const resetLocalState = () => {
        expenses = []; incomes = {}; closedMonths = {}; savingsForward = {}; userCategories = [];
        todosCache = [];
    };

    loginButton.addEventListener('click', () => { auth.signInWithEmailAndPassword(loginEmailInput.value, loginPasswordInput.value).catch(err => authError.textContent = err.message); });
    registerButton.addEventListener('click', () => {
        auth.createUserWithEmailAndPassword(registerEmailInput.value, registerPasswordInput.value)
        .then(userCredential => {
            db.collection('users').doc(userCredential.user.uid).set({
                expenses: [], incomes: {}, closedMonths: {}, savingsForward: {}, userCategories: []
            });
        })
        .catch(err => authError.textContent = err.message);
    });
    logoutButton.addEventListener('click', () => { auth.signOut(); });

    const saveData = saveDataToFirestore;

    // ZARZĄDZANIE KATEGORIAMI
    const openCategoryModal = () => {
        renderCategoryModalList();
        categoryModal.classList.remove('hidden');
        newCategoryNameInput.focus();
    };
    const closeCategoryModal = () => categoryModal.classList.add('hidden');
    
    const populateCategoryDropdown = () => {
        const allCategories = [...DEFAULT_CATEGORIES, ...userCategories];
        expenseCategorySelect.innerHTML = allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    };
    
    const renderCategoryModalList = () => {
        modalCategoryList.innerHTML = userCategories.map(cat => `
            <li class="category-item">
                <span>${cat}</span>
                <button data-category-name="${cat}" class="delete-category-btn">🗑️</button>
            </li>
        `).join('') || '<li class="empty-list-info">Brak własnych kategorii.</li>';
    };

    manageCategoriesBtn.addEventListener('click', openCategoryModal);

    saveCategoryBtn.addEventListener('click', () => {
        const newCategory = newCategoryNameInput.value;
        if (newCategory && newCategory.trim() !== '') {
            const trimmedCategory = newCategory.trim();
            if (![...userCategories, ...DEFAULT_CATEGORIES].map(c => c.toLowerCase()).includes(trimmedCategory.toLowerCase())) {
                userCategories.push(trimmedCategory);
                saveData();
                renderCategoryModalList();
                populateCategoryDropdown();
                newCategoryNameInput.value = '';
                newCategoryNameInput.focus();
            } else {
                alert('Ta kategoria już istnieje!');
            }
        }
    });

    modalCategoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-category-btn')) {
            itemToDelete = { type: 'category', data: e.target.dataset.categoryName };
            confirmModalText.textContent = `Czy na pewno chcesz trwale usunąć kategorię "${itemToDelete.data}"?`;
            confirmOkBtn.textContent = 'Tak, usuń';
            confirmModal.classList.remove('hidden');
        }
    });
    
    confirmOkBtn.addEventListener('click', () => {
        if (!itemToDelete.type) return;
        if (itemToDelete.type === 'category') {
            userCategories = userCategories.filter(cat => cat !== itemToDelete.data);
            saveData();
            renderCategoryModalList();
            populateCategoryDropdown();
        }
        if (itemToDelete.type === 'expense') {
            expenses = expenses.filter(exp => String(exp.id) !== itemToDelete.data);
            saveData();
            render();
        }
        if (itemToDelete.type === 'todo') {
            db.collection('users').doc(currentUserId).collection('todos').doc(itemToDelete.data).delete();
        }
        if (itemToDelete.type === 'event') {
            db.collection('users').doc(currentUserId).collection('calendarEvents').doc(itemToDelete.data).delete();
            calendar.refetchEvents();
        }
        confirmModal.classList.add('hidden');
        itemToDelete = { type: null, data: null };
    });

    confirmCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        itemToDelete = { type: null, data: null };
    });
    
    closeModalBtn.addEventListener('click', closeCategoryModal);

    // LOGIKA CHECKLISTY
    const renderTodoList = (todos) => {
        const sortedTodos = [...todos].sort((a, b) => {
            if (a.important === b.important) return (a.order || 0) - (b.order || 0);
            return a.important ? -1 : 1;
        });
        const groups = { overdue: [], today: [], tomorrow: [], upcoming: [], noDate: [] };
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
        sortedTodos.forEach(todo => {
            if (todo.completed) return;
            if (!todo.dueDate) {
                groups.noDate.push(todo);
            } else {
                const dueDate = todo.dueDate.toDate();
                if (dueDate < todayStart) groups.overdue.push(todo);
                else if (dueDate < tomorrowStart) groups.today.push(todo);
                else if (dueDate < tomorrowEnd) groups.tomorrow.push(todo);
                else groups.upcoming.push(todo);
            }
        });
        const completedTodos = todos.filter(todo => todo.completed).sort((a,b) => (b.completedAt?.toMillis() || 0) - (a.completedAt?.toMillis() || 0));
        todoList.innerHTML = '';
        const createGroupHTML = (title, group) => {
            if (group.length === 0) return '';
            return `
                <li class="todo-group-header">${title}</li>
                ${group.map(todo => {
                    const dueDate = todo.dueDate ? todo.dueDate.toDate() : null;
                    const dateString = dueDate ? `${dueDate.getDate().toString().padStart(2, '0')}.${(dueDate.getMonth() + 1).toString().padStart(2, '0')}` : '';
                    return `
                    <li class="todo-item ${todo.important ? 'important' : ''}" draggable="true" data-id="${todo.id}" data-date="${dueDate ? dueDate.toISOString().split('T')[0] : ''}">
                        <span class="drag-handle">⠿</span>
                        <div class="todo-content">
                            <span class="todo-text">${todo.text}</span>
                            ${dueDate ? `<span class="todo-due-date">${dateString}</span>` : ''}
                        </div>
                        <div class="todo-item-actions">
                            <button class="important-btn">${todo.important ? '★' : '☆'}</button>
                            <button class="edit-todo-btn">✏️</button>
                        </div>
                    </li>`;
                }).join('')}
            `;
        };
        let html = '';
        html += createGroupHTML('Zaległe', groups.overdue);
        html += createGroupHTML('Dzisiaj', groups.today);
        html += createGroupHTML('Jutro', groups.tomorrow);
        html += createGroupHTML('Nadchodzące', groups.upcoming);
        html += createGroupHTML('Bez terminu', groups.noDate);
        if (completedTodos.length > 0) {
            html += `
                <li class="todo-group-header">Ukończone</li>
                ${completedTodos.map(todo => `
                    <li class="todo-item completed" data-id="${todo.id}">
                        <span class="drag-handle" style="opacity:0; cursor: default;">⠿</span>
                        <div class="todo-content">
                           <span class="todo-text">${todo.text}</span>
                        </div>
                    </li>
                `).join('')}
            `;
        }
        todoList.innerHTML = html;
        if (todoList.innerHTML.trim() === '') {
            todoList.innerHTML = '<li class="empty-list-info">Brak zadań na liście.</li>';
        }
    };
    
    todoDateInput.addEventListener('change', () => {
        if(todoDateInput.value) {
            const date = new Date(todoDateInput.value + 'T00:00:00');
            todoDateDisplay.textContent = `Termin: ${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`;
        } else {
            todoDateDisplay.textContent = '';
        }
    });

    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const todoText = todoInput.value.trim();
        const todoDate = todoDateInput.value;
        if (todoText && currentUserId) {
            const newTodo = {
                text: todoText,
                completed: false,
                important: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                dueDate: todoDate ? firebase.firestore.Timestamp.fromDate(new Date(todoDate + 'T00:00:00')) : null,
                order: todosCache.filter(t => !t.completed).length
            };
            db.collection('users').doc(currentUserId).collection('todos').add(newTodo);
            todoInput.value = '';
            todoDateInput.value = '';
            todoDateDisplay.textContent = '';
        }
    });

    const handleTodoCompletion = (li, id) => {
        const isCompleted = !li.classList.contains('completed');
        const updateData = { completed: isCompleted };
        if(isCompleted) {
            updateData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        db.collection('users').doc(currentUserId).collection('todos').doc(id).update(updateData);
    };

    const handleTodoImportance = (li, id) => {
        const isImportant = !li.classList.contains('important');
        db.collection('users').doc(currentUserId).collection('todos').doc(id).update({ important: isImportant });
    };
    
    const handleTodoDelete = (li, id) => {
        itemToDelete = { type: 'todo', data: id };
        const todoText = li.querySelector('.todo-text').textContent;
        confirmModalText.textContent = `Czy na pewno chcesz usunąć zadanie "${todoText}"?`;
        confirmOkBtn.textContent = 'Tak, usuń';
        confirmModal.classList.remove('hidden');
    };

    todoList.addEventListener('click', (e) => {
        if (isEditing) return;
        const target = e.target;
        const li = target.closest('.todo-item');
        if (!li || !currentUserId) return;
        const todoId = li.dataset.id;
        
        if (target.classList.contains('todo-content') || target.classList.contains('todo-text') || target.classList.contains('todo-due-date')) {
            handleTodoCompletion(li, todoId);
        } else if (target.classList.contains('important-btn')) {
            handleTodoImportance(li, todoId);
        } else if (target.classList.contains('edit-todo-btn')) {
            handleTodoEdit(li);
        }
    });
    
    const handleTodoEdit = (li) => {
        if (li.classList.contains('is-editing')) return;
        li.classList.add('is-editing');
        li.setAttribute('draggable', 'false');
    
        const textSpan = li.querySelector('.todo-text');
        const currentText = textSpan.textContent;
        const currentDate = li.dataset.date;
    
        const contentDiv = li.querySelector('.todo-content');
        const actionsDiv = li.querySelector('.todo-item-actions');
        contentDiv.style.display = 'none';
        actionsDiv.style.display = 'none';

        const editWrapper = document.createElement('div');
        editWrapper.className = 'todo-edit-wrapper';
        editWrapper.innerHTML = `
            <input type="text" class="todo-edit-input" value="${currentText}">
            <input type="date" class="todo-edit-date" value="${currentDate}">
            <button class="save-todo-btn btn btn-accent">✔</button>
        `;
        li.appendChild(editWrapper);
    
        const saveButton = li.querySelector('.save-todo-btn');
        const textInput = li.querySelector('.todo-edit-input');
        const dateInput = li.querySelector('.todo-edit-date');
    
        textInput.focus();
    
        const saveChanges = () => {
            const newText = textInput.value.trim();
            const newDate = dateInput.value;
            if (newText) {
                const todoId = li.dataset.id;
                db.collection('users').doc(currentUserId).collection('todos').doc(todoId).update({
                    text: newText,
                    dueDate: newDate ? firebase.firestore.Timestamp.fromDate(new Date(newDate + 'T00:00:00')) : null
                });
            }
        };
    
        saveButton.addEventListener('click', saveChanges);
        textInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') saveChanges(); });
        dateInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') saveChanges(); });
    };

    let draggedItem = null;
    const cancelLongPress = () => clearTimeout(longPressTimer);

    todoList.addEventListener('dragstart', (e) => {
        if(e.target.classList.contains('completed') || e.target.classList.contains('is-editing') || !e.target.classList.contains('todo-item')) { e.preventDefault(); return; }
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
    });
    todoList.addEventListener('dragend', () => draggedItem?.classList.remove('dragging'));
    todoList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(todoList, e.clientY);
        const currentDragged = document.querySelector('.dragging');
        if(!currentDragged) return;
        if (afterElement == null) todoList.appendChild(currentDragged);
        else todoList.insertBefore(currentDragged, afterElement);
    });
    todoList.addEventListener('drop', () => {
        const batch = db.batch();
        const items = todoList.querySelectorAll('.todo-item:not(.completed)');
        items.forEach((item, index) => {
            const docRef = db.collection('users').doc(currentUserId).collection('todos').doc(item.dataset.id);
            batch.update(docRef, { order: index });
        });
        batch.commit().catch(err => console.error("Błąd zapisu kolejności:", err));
    });
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging):not(.completed)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    ['mousedown', 'touchstart'].forEach(evt => {
        todoList.addEventListener(evt, (e) => {
            const li = e.target.closest('.todo-item');
            if (isEditing || !li || e.target.classList.contains('drag-handle') || e.target.classList.contains('edit-todo-btn') || e.target.classList.contains('important-btn')) return;
            longPressTimer = setTimeout(() => handleTodoDelete(li, li.dataset.id), 500);
        });
    });
    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach(evt => todoList.addEventListener(evt, cancelLongPress));

    // LOGIKA KALENDARZA
    const initCalendar = () => {
        if (calendar) {
            calendar.refetchEvents();
            return;
        }
        
        const GOOGLE_CALENDAR_API_KEY = 'AIzaSyDmRluBCf1roLLGIh9Habo4EVvcDs7IWWc';

        calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'pl',
            firstDay: 1,
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
            editable: true,
            eventSources: [
                {
                    events: (fetchInfo, successCallback, failureCallback) => {
                        if (!currentUserId) { failureCallback('Brak użytkownika'); return; }
                        const eventsPromise = db.collection('users').doc(currentUserId).collection('calendarEvents').get();
                        const todosPromise = db.collection('users').doc(currentUserId).collection('todos').where('dueDate', '!=', null).get();

                        Promise.all([eventsPromise, todosPromise]).then(results => {
                            const calendarEvents = results[0].docs.map(doc => ({
                                id: doc.id,
                                title: doc.data().title,
                                start: doc.data().start.toDate(),
                                end: doc.data().end ? doc.data().end.toDate() : null,
                                allDay: doc.data().allDay,
                                classNames: ['calendar-event-item'],
                                extendedProps: { type: 'event' }
                            }));
                            const todoEvents = results[1].docs.map(doc => ({
                                id: doc.id,
                                title: `☑ ${doc.data().text}`,
                                start: doc.data().dueDate.toDate(),
                                allDay: true,
                                classNames: ['todo-event-item', doc.data().completed ? 'completed' : ''],
                                extendedProps: { type: 'todo', originalDoc: doc.data() }
                            }));
                            successCallback([...calendarEvents, ...todoEvents]);
                        }).catch(failureCallback);
                    }
                },
                {
                    googleCalendarId: 'pl.polish#holiday@group.v.calendar.google.com',
                    className: 'holiday-event',
                    color: 'transparent'
                }
            ],
            googleCalendarApiKey: GOOGLE_CALENDAR_API_KEY,
            dateClick: (info) => {
                let start = info.date;
                let allDay = info.allDay;
                let startTime = '12:00';
                if(!allDay){
                    startTime = `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}`;
                }
                openEventModal({ start, allDay, startTime });
            },
            eventClick: (info) => {
                const props = info.event.extendedProps;
                if (props.type === 'todo') {
                    db.collection('users').doc(currentUserId).collection('todos').doc(info.event.id).update({
                        completed: !props.originalDoc.completed,
                        completedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    return;
                };
                 if(info.event.source.googleCalendarId) return;
                
                openEventModal({
                    id: info.event.id,
                    title: info.event.title,
                    start: info.event.start,
                    end: info.event.end,
                    allDay: info.event.allDay
                });
            }
        });
        calendar.render();
    };
    
    const openEventModal = (eventData = {}) => {
        selectedEvent = eventData;
        eventModalTitle.textContent = eventData.id ? 'Edytuj wydarzenie' : 'Nowe wydarzenie';
        eventTitleInput.value = eventData.title || '';
        const formatDate = (date) => date ? new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '';
        const formatTime = (date, defaultTime) => date ? `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}` : defaultTime;

        eventStartDateInput.value = formatDate(eventData.start || new Date());
        eventStartTimeInput.value = eventData.allDay ? '' : formatTime(eventData.start, eventData.startTime || '12:00');
        eventEndDateInput.value = formatDate(eventData.end || eventData.start);
        eventEndTimeInput.value = eventData.allDay ? '' : formatTime(eventData.end || eventData.start);
        
        deleteEventBtn.style.display = eventData.id ? 'inline-block' : 'none';
        eventModal.classList.remove('hidden');
    };
    const closeEventModal = () => eventModal.classList.add('hidden');

    saveEventBtn.addEventListener('click', () => {
        const title = eventTitleInput.value.trim();
        if(!title) { alert('Tytuł jest wymagany.'); return; }
        const startDate = eventStartDateInput.value;
        const startTime = eventStartTimeInput.value || '00:00';
        const endDate = eventEndDateInput.value;
        const endTime = eventEndTimeInput.value || '00:00';
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = endDate ? new Date(`${endDate}T${endTime}`) : null;
        const eventData = {
            title,
            start: firebase.firestore.Timestamp.fromDate(startDateTime),
            end: endDateTime ? firebase.firestore.Timestamp.fromDate(endDateTime) : null,
            allDay: !eventStartTimeInput.value
        };
        const collectionRef = db.collection('users').doc(currentUserId).collection('calendarEvents');
        if (selectedEvent && selectedEvent.id) {
            collectionRef.doc(selectedEvent.id).update(eventData).then(() => {
                calendar.refetchEvents();
                closeEventModal();
            });
        } else {
            collectionRef.add(eventData).then(() => {
                calendar.refetchEvents();
                closeEventModal();
            });
        }
    });

    deleteEventBtn.addEventListener('click', () => {
        if(selectedEvent && selectedEvent.id) {
            itemToDelete = { type: 'event', data: selectedEvent.id };
            confirmModalText.textContent = `Czy na pewno chcesz usunąć wydarzenie "${selectedEvent.title}"?`;
            confirmOkBtn.textContent = 'Tak, usuń';
            confirmModal.classList.remove('hidden');
            closeEventModal();
        }
    });

    closeEventModalBtn.addEventListener('click', closeEventModal);

    // NAWIGACJA
    const switchView = (targetView) => {
        activeTab = targetView;
        budgetView.style.display = 'none';
        dashboardView.style.display = 'none';
        todoView.style.display = 'none';
        calendarView.style.display = 'none';
        navBudgetBtn.classList.remove('active');
        navDashboardBtn.classList.remove('active');
        navTodoBtn.classList.remove('active');
        navCalendarBtn.classList.remove('active');
        if (targetView === 'budget') {
            budgetView.style.display = 'block';
            navBudgetBtn.classList.add('active');
        } else if (targetView === 'dashboard') {
            dashboardView.style.display = 'block';
            navDashboardBtn.classList.add('active');
        } else if (targetView === 'todo') {
            todoView.style.display = 'block';
            navTodoBtn.classList.add('active');
        } else if (targetView === 'calendar') {
            calendarView.style.display = 'block';
            navCalendarBtn.classList.add('active');
            initCalendar();
        }
        render();
    };

    navBudgetBtn.addEventListener('click', () => switchView('budget'));
    navDashboardBtn.addEventListener('click', () => switchView('dashboard'));
    navTodoBtn.addEventListener('click', () => switchView('todo'));
    navCalendarBtn.addEventListener('click', () => switchView('calendar'));
    
    // GŁÓWNA LOGIKA RENDEROWANIA I POZOSTAŁE FUNKCJE
    const render = () => { isEditing = false; if (activeTab === 'budget') { renderBudgetView(); } else if (activeTab === 'dashboard') { renderDashboardView(); } if (activeTab === 'budget' || activeTab === 'dashboard') { updateDateDisplay(); } };
    const renderBudgetView = () => { populateCategoryDropdown(); renderBalance(); renderCloseMonthButton(); if (currentView === 'monthly') renderMonthlyTable(); else renderYearlyTable(); };
    const formatCurrency = (amount, signDisplay = 'auto') => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', signDisplay }).format(amount || 0);
    const getKeyForDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const updateDateDisplay = () => { if (activeTab !== 'budget') return; if (currentView === 'monthly') currentDateDisplay.textContent = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`; else currentDateDisplay.textContent = currentDate.getFullYear(); };
    const renderBalance = () => { const monthKey = getKeyForDate(currentDate); const forwardedSavings = savingsForward[monthKey] || 0; const currentIncome = incomes[monthKey] || 0; const totalIncome = currentIncome + forwardedSavings; const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(monthKey)); const totalPaid = monthExpenses.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0); const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0); const actualBalance = totalIncome - totalExpenses; incomeInput.value = currentIncome > 0 ? currentIncome : ''; forwardedSavingsValueEl.textContent = formatCurrency(forwardedSavings); balanceValueEl.textContent = formatCurrency(actualBalance); balanceValueEl.className = `value ${actualBalance >= 0 ? 'positive' : 'negative'}`; plannedExpensesValueEl.textContent = formatCurrency(totalExpenses); totalPaidValueEl.textContent = formatCurrency(totalPaid); };
    const renderMonthlyTable = () => { tableHead.innerHTML = `<tr><th>Opis</th><th>Kwota</th><th>Kategoria</th><th>Data</th><th>Opłacone</th></tr>`; const monthKey = getKeyForDate(currentDate); const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(monthKey)).sort((a,b) => new Date(b.date) - new Date(a.date)); tableBody.innerHTML = monthExpenses.map(expense => `<tr data-id="${expense.id}" class="expense-row"><td class="expense-cell"><div class="expense-wrapper"><div class="expense-info"><div class="expense-main"><span class="expense-description editable" data-field="description">${expense.description}</span><span class="expense-amount editable" data-field="amount">${formatCurrency(expense.amount)}</span></div><div class="expense-details"><span class="expense-category editable" data-field="category">${expense.category}</span><span class="expense-date editable" data-field="date">${expense.date}</span></div></div><div class="expense-actions"><input type="checkbox" ${expense.paid ? 'checked' : ''}></div></div></td></tr>`).join(''); if (monthExpenses.length === 0) { tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Brak wydatków.</td></tr>`; } };
    const renderYearlyTable = () => { tableHead.innerHTML = `<tr><th>Kat.</th>${MONTHS.map(m => `<th>${m.substring(0,3)}</th>`).join('')}<th>Suma</th></tr>`; const year = currentDate.getFullYear(); const yearExpenses = expenses.filter(e => e.date && e.date.startsWith(String(year))); const categories = [...new Set(yearExpenses.map(e => e.category))]; let bodyHtml = categories.map(cat => { let categoryTotal = 0; const monthlySums = Array(12).fill(0).map((_, i) => { const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`; const sum = yearExpenses.filter(e => e.category === cat && e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0); categoryTotal += sum; return `<td>${sum > 0 ? formatCurrency(sum) : '-'}</td>`; }).join(''); return `<tr><td>${cat}</td>${monthlySums}<td><strong>${formatCurrency(categoryTotal)}</strong></td></tr>`; }).join(''); let grandTotal = 0; const totalSums = Array(12).fill(0).map((_, i) => { const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`; const total = yearExpenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0); grandTotal += total; return `<td>${formatCurrency(total)}</td>`; }).join(''); bodyHtml += `<tr style="font-weight: bold; border-top: 2px solid var(--text-color);"><td><strong>SUMA</strong></td>${totalSums}<td>${formatCurrency(grandTotal)}</td></tr>`; tableBody.innerHTML = bodyHtml; if(categories.length === 0) tableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 2rem;">Brak wydatków.</td></tr>`; };
    const renderCloseMonthButton = () => { const monthKey = getKeyForDate(currentDate); if (closedMonths[monthKey]) { closeMonthBtn.textContent = 'Otwórz miesiąc'; closeMonthBtn.onclick = () => { delete closedMonths[monthKey]; const nextMonthDate = new Date(currentDate); nextMonthDate.setMonth(nextMonthDate.getMonth() + 1); const nextMonthKey = getKeyForDate(nextMonthDate); delete savingsForward[nextMonthKey]; saveData(); render(); }; } else { closeMonthBtn.textContent = 'Zamknij miesiąc'; closeMonthBtn.onclick = () => closeMonthPrompt.classList.toggle('hidden'); } };
    const renderDashboardView = () => { if(window.pieChartInstance) window.pieChartInstance.destroy(); if(window.barChartInstance) window.barChartInstance.destroy(); populateDashboardSelectors(); const isYearly = dashboardDisplayMode === 'yearly'; const year = dashboardDate.getFullYear(); let filteredExpenses, previousPeriodExpenses; let totalIncome = 0; if (isYearly) { const yearStr = String(year); filteredExpenses = expenses.filter(e => e.date && e.date.startsWith(yearStr)); previousPeriodExpenses = expenses.filter(e => e.date && e.date.startsWith(String(year - 1))); totalIncome = Object.entries(incomes).filter(([k]) => k.startsWith(yearStr)).reduce((s, [,v]) => s + v, 0) + Object.entries(savingsForward).filter(([k]) => k.startsWith(yearStr)).reduce((s, [,v]) => s + v, 0); } else { const monthKey = getKeyForDate(dashboardDate); filteredExpenses = expenses.filter(e => e.date && e.date.startsWith(monthKey)); const prevDate = new Date(dashboardDate); prevDate.setMonth(prevDate.getMonth() - 1); const prevMonthKey = getKeyForDate(prevDate); previousPeriodExpenses = expenses.filter(e => e.date && e.date.startsWith(prevMonthKey)); totalIncome = (incomes[monthKey] || 0) + (savingsForward[monthKey] || 0); } const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0); const balance = totalIncome - totalExpenses; document.getElementById('kpi-total-income').textContent = formatCurrency(totalIncome); document.getElementById('kpi-total-expenses').textContent = formatCurrency(totalExpenses); document.getElementById('kpi-balance').textContent = formatCurrency(balance); document.getElementById('kpi-balance').style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)'; const totalPreviousExpenses = previousPeriodExpenses.reduce((s, e) => s + e.amount, 0); const comparisonEl = document.getElementById('kpi-comparison'); document.getElementById('kpi-comparison-label').textContent = isYearly ? "Porównanie wydatków z pop. rokiem" : "Porównanie wydatków z pop. miesiąca"; if (totalPreviousExpenses > 0) { const diff = totalExpenses - totalPreviousExpenses; comparisonEl.textContent = formatCurrency(diff, 'exceptZero'); comparisonEl.style.color = diff > 0 ? 'var(--danger-color)' : 'var(--success-color)'; } else { comparisonEl.textContent = "N/A"; comparisonEl.style.color = 'var(--text-color)'; } const categorySpending = filteredExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {}); const sortedCategories = Object.entries(categorySpending).sort(([,a],[,b]) => b - a); const categorySummaryTable = document.getElementById('category-summary-table'); categorySummaryTable.innerHTML = sortedCategories.map(([cat, amount]) => `<tr><td>${cat}</td><td style="text-align: right;">${formatCurrency(amount)}</td></tr>`).join(''); if (sortedCategories.length === 0) categorySummaryTable.innerHTML = `<tr><td colspan="2">Brak danych.</td></tr>`; const expenseSummaryTable = document.getElementById('expense-summary-table'); const sortedExpenses = [...filteredExpenses].sort((a,b) => b.amount - a.amount); expenseSummaryTable.innerHTML = sortedExpenses.map(exp => `<tr><td>${exp.description}</td><td style="text-align: right;">${formatCurrency(exp.amount)}</td></tr>`).join(''); if (sortedExpenses.length === 0) expenseSummaryTable.innerHTML = `<tr><td colspan="2">Brak wydatków.</td></tr>`; const computedStyles = getComputedStyle(appBody); const chartTextColor = computedStyles.getPropertyValue('--text-color').trim(); const chartGridColor = computedStyles.getPropertyValue('--border-color').trim(); const accentColor = computedStyles.getPropertyValue('--accent-color').trim(); const accentColorTransparent = accentColor + '80'; const pieCtx = document.getElementById('category-pie-chart').getContext('2d'); window.pieChartInstance = new Chart(pieCtx, { type: 'doughnut', data: { labels: sortedCategories.map(([cat]) => cat), datasets: [{ data: sortedCategories.map(([, amount]) => amount), backgroundColor: ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f97316', '#eab308', '#64748b', '#ef4444', '#14b8a6'], borderColor: computedStyles.getPropertyValue('--card-bg-color').trim(), borderWidth: 4, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, padding: 15 } } }, cutout: '60%' } }); const barCtx = document.getElementById('history-bar-chart').getContext('2d'); let barLabels, barData; document.getElementById('bar-chart-title').textContent = isYearly ? "Wydatki w ciągu roku" : "Największe wydatki w miesiącu"; if (isYearly) { barLabels = MONTHS; barData = MONTHS.map((_, i) => { const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`; return filteredExpenses.filter(e => e.date && e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0); }); } else { const topExpenses = filteredExpenses.sort((a,b) => b.amount - a.amount).slice(0, 10); barLabels = topExpenses.map(e => e.description.length > 15 ? e.description.substring(0, 12)+'...' : e.description); barData = topExpenses.map(e => e.amount); } const barGradient = barCtx.createLinearGradient(0, 0, 0, barCtx.canvas.height); barGradient.addColorStop(0, accentColor); barGradient.addColorStop(1, accentColorTransparent); window.barChartInstance = new Chart(barCtx, { type: 'bar', data: { labels: barLabels, datasets: [{ label: 'Suma wydatków', data: barData, backgroundColor: barGradient, borderColor: accentColor, borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } }, x: { ticks: { color: chartTextColor }, grid: { display: false } } }, plugins: { legend: { display: false } } } }); };
    const populateDashboardSelectors = () => { const yearSelect = document.getElementById('dashboard-year-select'); const monthSelect = document.getElementById('dashboard-month-select'); const yearsWithData = [...new Set(expenses.map(e => e.date ? e.date.substring(0, 4) : null).filter(Boolean))]; const currentYear = new Date().getFullYear(); if (!yearsWithData.includes(String(currentYear))) yearsWithData.push(String(currentYear)); yearsWithData.sort((a, b) => b - a); yearSelect.innerHTML = yearsWithData.map(y => `<option value="${y}" ${y == dashboardDate.getFullYear() ? 'selected' : ''}>${y}</option>`).join(''); monthSelect.innerHTML = MONTHS.map((m, i) => `<option value="${i}" ${i == dashboardDate.getMonth() ? 'selected' : ''}>${m}</option>`).join(''); monthSelect.style.display = dashboardDisplayMode === 'monthly' ? 'block' : 'none'; };
    const handleEdit = (target) => { if (isEditing) return; isEditing = true; const row = target.closest('tr'); const id = row.dataset.id; const expense = expenses.find(exp => String(exp.id) === id); if (!expense) { isEditing = false; return; } const field = target.dataset.field; const originalValue = (field === 'amount') ? expense.amount : expense[field]; let input; if (field === 'category') { input = document.createElement('select'); [...DEFAULT_CATEGORIES, ...userCategories].forEach(cat => { const opt = document.createElement('option'); opt.value = opt.textContent = cat; if (cat === originalValue) opt.selected = true; input.appendChild(opt); }); } else { input = document.createElement('input'); input.type = (field === 'amount') ? 'number' : (field === 'date' ? 'date' : 'text'); if(field === 'amount') input.step = '0.01'; input.value = originalValue; } target.style.display = 'none'; target.parentNode.insertBefore(input, target.nextSibling); input.focus(); const saveChange = () => { let newValue = input.value; if (field === 'amount') newValue = parseFloat(newValue) || 0; expense[field] = newValue; saveData(); render(); }; input.addEventListener('blur', saveChange); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.remove(); target.style.display = ''; isEditing = false; } }); };
    document.getElementById('monthly-view-btn').addEventListener('click', () => { currentView = 'monthly'; document.getElementById('monthly-view-btn').classList.add('active'); document.getElementById('yearly-view-btn').classList.remove('active'); render(); });
    document.getElementById('yearly-view-btn').addEventListener('click', () => { currentView = 'yearly'; document.getElementById('yearly-view-btn').classList.add('active'); document.getElementById('monthly-view-btn').classList.remove('active'); render(); });
    const navigateDate = (dir) => { if (currentView === 'monthly') currentDate.setMonth(currentDate.getMonth() + dir); else currentDate.setFullYear(currentDate.getFullYear() + dir); render(); };
    document.getElementById('prev-date-btn').addEventListener('click', () => navigateDate(-1));
    document.getElementById('next-date-btn').addEventListener('click', () => navigateDate(1));
    incomeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { incomes[getKeyForDate(currentDate)] = parseFloat(e.target.value) || 0; saveData(); renderBalance(); e.target.blur(); } });
    expenseForm.addEventListener('submit', (e) => { e.preventDefault(); if (!currentUserId) { alert("Błąd: Użytkownik nie jest zalogowany."); return; } const newExpense = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), description: document.getElementById('expense-description').value, amount: parseFloat(document.getElementById('expense-amount').value), category: document.getElementById('expense-category').value, date: `${getKeyForDate(currentDate)}-${String(new Date().getDate()).padStart(2, '0')}`, paid: false }; expenses.push(newExpense); saveData(); render(); expenseForm.reset(); });
    document.getElementById('copy-expenses-btn').addEventListener('click', () => { const prevMonthDate = new Date(currentDate); prevMonthDate.setMonth(prevMonthDate.getMonth() - 1); const prevMonthKey = getKeyForDate(prevMonthDate); const currentMonthKey = getKeyForDate(currentDate); const prevMonthExpenses = expenses.filter(e => e.date && e.date.startsWith(prevMonthKey)); if (prevMonthExpenses.length > 0) { prevMonthExpenses.forEach(exp => expenses.push({ ...exp, id: Date.now().toString() + Math.random(), date: exp.date.replace(prevMonthKey, currentMonthKey), paid: false })); saveData(); render(); } });
    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach(evt => tableBody.addEventListener(evt, cancelLongPress));
    const handleExpenseDelete = (row) => { itemToDelete = { type: 'expense', data: row.dataset.id }; const expense = expenses.find(exp => String(exp.id) === itemToDelete.data); if (!expense) return; confirmModalText.textContent = `Czy na pewno chcesz usunąć wydatek "${expense.description}"?`; confirmOkBtn.textContent = 'Tak, usuń'; confirmModal.classList.remove('hidden'); };
    tableBody.addEventListener('mousedown', (e) => { if (isEditing || e.target.closest('input, select')) return; const row = e.target.closest('tr.expense-row'); if (!row) return; longPressTimer = setTimeout(() => handleExpenseDelete(row), 500); });
    tableBody.addEventListener('touchstart', (e) => { if (isEditing || e.target.closest('input, select')) return; const row = e.target.closest('tr.expense-row'); if (!row) return; longPressTimer = setTimeout(() => handleExpenseDelete(row), 500); });
    tableBody.addEventListener('click', (e) => { cancelLongPress(); if (e.target.classList.contains('editable')) handleEdit(e.target); if (e.target.type === 'checkbox') { const row = e.target.closest('tr'); const id = row.dataset.id; const expense = expenses.find(exp => String(exp.id) === id); if(expense) { expense.paid = e.target.checked; saveData(); renderBalance(); } } });
    const savingsAmountInput = document.getElementById('savings-amount');
    const saveSavingsBtn = document.getElementById('save-savings-yes');
    savingsAmountInput.addEventListener('input', () => { saveSavingsBtn.disabled = !savingsAmountInput.value || parseFloat(savingsAmountInput.value) < 0; });
    saveSavingsBtn.addEventListener('click', () => { const amount = parseFloat(savingsAmountInput.value); const currentMonthKey = getKeyForDate(currentDate); const nextMonthDate = new Date(currentDate); nextMonthDate.setMonth(nextMonthDate.getMonth() + 1); const nextMonthKey = getKeyForDate(nextMonthDate); savingsForward[nextMonthKey] = amount; closedMonths[currentMonthKey] = true; saveData(); closeMonthPrompt.classList.add('hidden'); savingsAmountInput.value = ''; saveSavingsBtn.disabled = true; render(); });
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
    };
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').then(reg => console.log('SW registered!', reg)).catch(err => console.log('SW registration failed: ', err));
        });
    }
    init();
});