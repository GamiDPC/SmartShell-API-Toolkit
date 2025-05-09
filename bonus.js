const API_URL = 'https://billing.smartshell.gg/api/graphql';

let userData = {
    token: '',
    companyId: ''
};

let clients = [];
let selectedClients = new Set();

const themeToggle = document.getElementById('themeToggle');
const logoutButton = document.getElementById('logoutButton');
const searchInput = document.getElementById('searchInput');
const minDepositFilter = document.getElementById('minDepositFilter');
const maxDepositFilter = document.getElementById('maxDepositFilter');
const minBonusFilter = document.getElementById('minBonusFilter');
const maxBonusFilter = document.getElementById('maxBonusFilter');
const minHoursFilter = document.getElementById('minHoursFilter');
const maxHoursFilter = document.getElementById('maxHoursFilter');
const minDiscountFilter = document.getElementById('minDiscountFilter');
const maxDiscountFilter = document.getElementById('maxDiscountFilter');
const activityFromDate = document.getElementById('activityFromDate');
const activityToDate = document.getElementById('activityToDate');
const registrationFromDate = document.getElementById('registrationFromDate');
const registrationToDate = document.getElementById('registrationToDate');
const clientsTableBody = document.getElementById('clientsTableBody');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectedCount = document.getElementById('selectedCount');
const totalBonus = document.getElementById('totalBonus');
const sendBonusButton = document.getElementById('sendBonusButton');
const massBonusInput = document.getElementById('massBonusInput');
const prevPageButton = document.getElementById('prevPageButton');
const nextPageButton = document.getElementById('nextPageButton');
const currentPageInfo = document.getElementById('currentPageInfo');
const totalClientsInfo = document.getElementById('totalClientsInfo');
const loadAllButton = document.getElementById('loadAllButton');
const loadingNotification = document.getElementById('loadingNotification');
const notificationText = document.getElementById('notificationText');
const notificationProgressBar = document.getElementById('notificationProgressBar');
const notificationCancelButton = document.getElementById('notificationCancelButton');
const notificationCancelButton2 = document.getElementById('notificationCancelButton2');
const topLoadingBar = document.getElementById('topLoadingBar');

const ITEMS_PER_PAGE = 100;
let currentPage = 1;
let totalClients = 0;
let lastPage = 1;

const REQUEST_DELAY = 4000;
let isLoadingAll = false;
let allClients = [];

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initDateFilters();
    
    fetchClients(currentPage, ITEMS_PER_PAGE)
        .then(data => {
            renderClients();
            renderPagination(data.pagination);
        });

    themeToggle.addEventListener('change', toggleTheme);
    logoutButton.addEventListener('click', logout);

    searchInput.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    minDepositFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    maxDepositFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    minBonusFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    maxBonusFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    minHoursFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    maxHoursFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    minDiscountFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });
    
    maxDiscountFilter.addEventListener('input', () => {
        renderClients();
        updateSummary();
    });

    activityFromDate.addEventListener('change', () => {
        renderClients();
        updateSummary();
    });
    
    activityToDate.addEventListener('change', () => {
        renderClients();
        updateSummary();
    });
    
    registrationFromDate.addEventListener('change', () => {
        renderClients();
        updateSummary();
    });
    
    registrationToDate.addEventListener('change', () => {
        renderClients();
        updateSummary();
    });

    selectAllCheckbox.addEventListener('change', function() {
        if (this.checked) {
            selectAllDisplayedClients();
        } else {
            deselectAllDisplayedClients();
        }
    });
    
    sendBonusButton.addEventListener('click', sendBonuses);

    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            showTopLoader(true);
            fetchClients(currentPage, ITEMS_PER_PAGE)
                .then(data => {
                    renderClients();
                    renderPagination(data.pagination);
                })
                .finally(() => {
                    showTopLoader(false);
                });
        }
    });
    
    nextPageButton.addEventListener('click', () => {
        if (currentPage < lastPage) {
            currentPage++;
            showTopLoader(true);
            fetchClients(currentPage, ITEMS_PER_PAGE)
                .then(data => {
                    renderClients();
                    renderPagination(data.pagination);
                })
                .finally(() => {
                    showTopLoader(false);
                });
        }
    });

    loadAllButton.addEventListener('click', loadAllClients);
    notificationCancelButton.addEventListener('click', cancelLoadAll);
    notificationCancelButton2.addEventListener('click', cancelLoadAll);
    massBonusInput.addEventListener('input', updateBonusSum);
});

function initDateFilters() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    activityFromDate.max = todayStr;
    activityToDate.max = todayStr;
    registrationFromDate.max = todayStr;
    registrationToDate.max = todayStr;
}

function updateBonusSum() {
    updateSummary();
}

async function fetchClients(page = 1, perPage = ITEMS_PER_PAGE) {
    try {
        showTopLoader(true);

        const query = `query clients($page: Int, $first: Int) {
            clients(page: $page, first: $first) {
                data {
                    id
                    uuid
                    nickname
                    login
                    phone
                    email
                    first_name
                    last_name
                    middle_name
                    deposit
                    bonus
                    last_client_activity
                    user_discount
                    created_at
                    banned_at
                    total_hours
                    city
                }
                total_deposits
                paginatorInfo {
                    count
                    total
                    currentPage
                    lastPage
                    hasMorePages
                }
            }
        }`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            },
            body: JSON.stringify({
                query: query,
                variables: {
                    page: page,
                    first: perPage
                }
            })
        });

        const result = await response.json();
        
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        const clientsData = result.data.clients;
        clients = clientsData.data;
        totalClients = clientsData.paginatorInfo.total;
        currentPage = clientsData.paginatorInfo.currentPage;
        lastPage = clientsData.paginatorInfo.lastPage;
        showTopLoader(false);
        return {
            clients: clients,
            pagination: clientsData.paginatorInfo,
            totalDeposits: clientsData.total_deposits
        };
    } catch (error) {
        console.error('Ошибка при получении списка клиентов:', error);
        showTopLoader(false);
        alert(`Ошибка при загрузке клиентов: ${error.message}`);
        
        if (error.message.includes('token') || error.message.includes('unauthorized')) {
            window.location.href = 'index.html';
        }
        throw error;
    }
}
function renderPagination(paginationInfo) {
    if (!paginationInfo) return;
    
    totalClients = paginationInfo.total;
    currentPage = paginationInfo.currentPage;
    lastPage = paginationInfo.lastPage;
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalClients);
    
    currentPageInfo.textContent = `${start}-${end}`;
    totalClientsInfo.textContent = totalClients;
    
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = !paginationInfo.hasMorePages;
}

function renderClients() {
    clientsTableBody.innerHTML = '';
    const filteredClients = filterClients();
    
    if (filteredClients.length === 0) {
        clientsTableBody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-message">Клиенты не найдены</td>
            </tr>
        `;
        return;
    }
    
    filteredClients.forEach(client => {
        const row = createClientRow(client);
        clientsTableBody.appendChild(row);
    });
    
    updateSummary();
    updateSelectAllCheckbox();
}

function createClientRow(client) {
    const row = document.createElement('tr');
    row.className = selectedClients.has(client.id) ? 'selected' : '';
    row.dataset.clientId = client.id;

    const fullName = [client.last_name, client.first_name, client.middle_name]
        .filter(Boolean)
        .join(' ');
    
    const displayName = fullName || client.nickname || 'Без имени';

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    row.innerHTML = `
        <td class="checkbox-cell">
            <input type="checkbox" class="checkbox" ${selectedClients.has(client.id) ? 'checked' : ''}>
        </td>
        <td><span class="truncate" title="${displayName}">${displayName}</span></td>
        <td>${client.phone || '-'}</td>
        <td>${client.deposit.toFixed(2)}</td>
        <td>${client.bonus ? client.bonus.toFixed(2) : '0.00'}</td>
        <td>${client.total_hours}</td>
        <td>${client.user_discount}%</td>
        <td>${formatDate(client.last_client_activity)}</td>
        <td>${formatDate(client.created_at)}</td>
    `;

    const checkbox = row.querySelector('.checkbox');
    checkbox.addEventListener('change', () => {
        toggleClientSelection(client.id);
    });
    
    return row;
}

function updateSelectAllCheckbox() {
    const filteredClients = filterClients();
    const allSelected = filteredClients.length > 0 && 
        filteredClients.every(client => selectedClients.has(client.id));
    selectAllCheckbox.checked = allSelected;
}

function filterClients() {
    const searchTerm = searchInput.value.toLowerCase();
    
    const minDeposit = minDepositFilter.value ? parseFloat(minDepositFilter.value) : null;
    const maxDeposit = maxDepositFilter.value ? parseFloat(maxDepositFilter.value) : null;
    const minBonus = minBonusFilter.value ? parseFloat(minBonusFilter.value) : null;
    const maxBonus = maxBonusFilter.value ? parseFloat(maxBonusFilter.value) : null;
    const minHours = minHoursFilter.value ? parseFloat(minHoursFilter.value) : null;
    const maxHours = maxHoursFilter.value ? parseFloat(maxHoursFilter.value) : null;
    const minDiscount = minDiscountFilter.value ? parseFloat(minDiscountFilter.value) : null;
    const maxDiscount = maxDiscountFilter.value ? parseFloat(maxDiscountFilter.value) : null;
    
    const activityFrom = activityFromDate.value ? new Date(activityFromDate.value) : null;
    const activityTo = activityToDate.value ? new Date(activityToDate.value + 'T23:59:59') : null;
    
    const registrationFrom = registrationFromDate.value ? new Date(registrationFromDate.value) : null;
    const registrationTo = registrationToDate.value ? new Date(registrationToDate.value + 'T23:59:59') : null;
    
    return clients.filter(client => {
        const matchesSearch = (client.first_name && client.first_name.toLowerCase().includes(searchTerm)) ||
                             (client.last_name && client.last_name.toLowerCase().includes(searchTerm)) ||
                             (client.phone && client.phone.toLowerCase().includes(searchTerm)) ||
                             (client.nickname && client.nickname.toLowerCase().includes(searchTerm));
        const matchesDeposit = (minDeposit === null || client.deposit >= minDeposit) && 
                              (maxDeposit === null || client.deposit <= maxDeposit);
        const clientBonus = client.bonus || 0;
        const matchesBonus = (minBonus === null || clientBonus >= minBonus) && 
                            (maxBonus === null || clientBonus <= maxBonus);
        const matchesHours = (minHours === null || client.total_hours >= minHours) && 
                            (maxHours === null || client.total_hours <= maxHours);
        const matchesDiscount = (minDiscount === null || client.user_discount >= minDiscount) && 
                               (maxDiscount === null || client.user_discount <= maxDiscount);
        
        let matchesActivityDate = true;
        if (client.last_client_activity) {
            const activityDate = new Date(client.last_client_activity);
            if (activityFrom && activityDate < activityFrom) matchesActivityDate = false;
            if (activityTo && activityDate > activityTo) matchesActivityDate = false;
        } else if (activityFrom || activityTo) {
            matchesActivityDate = false;
        }
        
        let matchesRegistrationDate = true;
        if (client.created_at) {
            const registrationDate = new Date(client.created_at);
            if (registrationFrom && registrationDate < registrationFrom) matchesRegistrationDate = false;
            if (registrationTo && registrationDate > registrationTo) matchesRegistrationDate = false;
        } else if (registrationFrom || registrationTo) {
            matchesRegistrationDate = false;
        }
        
        return matchesSearch && matchesDeposit && matchesBonus && matchesHours && matchesDiscount && matchesActivityDate && matchesRegistrationDate;
    });
}

function toggleClientSelection(clientId) {
    if (selectedClients.has(clientId)) {
        selectedClients.delete(clientId);
    } else {
        selectedClients.add(clientId);
    }
    
    const row = document.querySelector(`tr[data-client-id="${clientId}"]`);
    if (row) {
        row.classList.toggle('selected');
        const checkbox = row.querySelector('.checkbox');
        if (checkbox) {
            checkbox.checked = selectedClients.has(clientId);
        }
    }
    
    updateSummary();
    updateSelectAllCheckbox();
}

function selectAllDisplayedClients() {
    const filteredClients = filterClients();
    filteredClients.forEach(client => {
        selectedClients.add(client.id);
    });
    selectAllCheckbox.checked = true;
    renderClients();
    updateSummary();
}

function deselectAllDisplayedClients() {
    const filteredClients = filterClients();
    filteredClients.forEach(client => {
        selectedClients.delete(client.id);
    });
    selectAllCheckbox.checked = false;
    renderClients();
    updateSummary();
}

function deselectAllClients() {
    selectedClients.clear();
    selectAllCheckbox.checked = false;
    renderClients();
    updateSummary();
}

function updateSummary() {
    selectedCount.textContent = selectedClients.size;
    totalBonus.textContent = calculateTotalBonus().toFixed(2);
}

function calculateTotalBonus() {
    let total = 0;
    if (selectedClients.size > 0) {
        const bonusAmount = parseFloat(massBonusInput.value) || 0;
        total = selectedClients.size * bonusAmount;
    }
    return total;
}

async function setClientBonus(clientUuid, bonusAmount) {
    const query = `
        mutation setBonus($input: SetBonusInput!) {
            setBonus(input: $input) {
                id
                uuid
                bonus
            }
        }
    `;

    const variables = {
        input: {
            client_uuid: clientUuid,
            value: bonusAmount
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    });

    const result = await response.json();
    
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    return result.data.setBonus;
}

function updateLoadingStatus(currentPage, totalPages, totalRequests) {
    const percent = Math.round((currentPage / totalPages) * 100);
    notificationProgressBar.style.width = `${percent}%`;
    
    if (isLoadingAll) {
        loadAllButton.textContent = `Загрузка ${percent}%`;
    }
    
    notificationText.textContent = `Загрузка: ${currentPage}/${totalRequests} страниц`;
}

async function sendBonuses() {
    if (selectedClients.size === 0) {
        alert('Выберите хотя бы одного клиента!');
        return;
    }

    const massBonusValue = parseFloat(massBonusInput.value) || 0;
    if (massBonusValue <= 0) {
        alert('Введите сумму бонуса в поле "Сумма бонуса для выбранных клиентов"');
        return;
    }
    
    if (!confirm(`Выдать ${massBonusValue.toFixed(2)} бонус для ${selectedClients.size} клиентов на общую сумму ${(massBonusValue * selectedClients.size).toFixed(2)}?`)) {
        return;
    }
    
    try {
        showTopLoader(true);
        
        const failedClients = [];
        const successClients = [];
        
        const originalButtonText = loadAllButton.textContent;
        
        const selectedClientsData = clients.filter(client => selectedClients.has(client.id));
        
        showNotification(true, selectedClientsData.length);
        
        let processedCount = 0;
        for (const client of selectedClientsData) {
            try {
                const currentBonus = client.bonus || 0;
                const newTotalBonus = currentBonus + massBonusValue;
                
                notificationProgressBar.style.width = `${Math.round((processedCount + 1) / selectedClientsData.length * 100)}%`;
                notificationText.textContent = `Выдача бонусов: ${processedCount + 1}/${selectedClientsData.length} клиентов`;
                
                const result = await setClientBonus(client.uuid, newTotalBonus);
                
                const clientIndex = clients.findIndex(c => c.id === client.id);
                if (clientIndex !== -1) {
                    clients[clientIndex].bonus = result.bonus;
                }
                
                successClients.push({
                    id: client.id,
                    name: [client.last_name, client.first_name, client.middle_name].filter(Boolean).join(' ') || client.nickname || 'Без имени',
                    previousBonus: currentBonus,
                    newBonus: result.bonus
                });
                
                renderClients();
                
                if (processedCount < selectedClientsData.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
                }
            } catch (error) {
                console.error(`Ошибка при выдаче бонуса клиенту ${client.id}:`, error);
                failedClients.push({
                    id: client.id,
                    name: [client.last_name, client.first_name, client.middle_name].filter(Boolean).join(' ') || client.nickname || 'Без имени',
                    error: error.message
                });
            }
            processedCount++;
        }

        loadAllButton.textContent = originalButtonText;
        showNotification(false);
        selectedClients.clear();
        massBonusInput.value = '';
        updateSummary();
        if (failedClients.length === 0) {
            alert(`Бонусы успешно выданы ${successClients.length} клиентам!`);
        } else {
            alert(`Бонусы выданы ${successClients.length} клиентам. Ошибки при выдаче ${failedClients.length} клиентам.`);
            console.log('Успешно:', successClients);
            console.log('Ошибки:', failedClients);
        }
    } catch (error) {
        console.error('Ошибка при отправке бонусов:', error);
        alert(`Произошла ошибка при отправке бонусов: ${error.message}`);
    } finally {
        showTopLoader(false);
        showNotification(false);
    }
}

function logout() {
    localStorage.removeItem('smartshell_token');
    localStorage.removeItem('smartshell_company_id');
    window.location.href = 'index.html';
}

function initTheme() {
    const savedDarkMode = localStorage.getItem('smartshell_dark_mode') === 'true';
    setTheme(savedDarkMode);
    
    const token = localStorage.getItem('smartshell_token');
    const companyId = localStorage.getItem('smartshell_company_id');
    
    if (token && companyId) {
        userData.token = token;
        userData.companyId = companyId;
    } else {
        window.location.href = 'index.html';
    }
}

function toggleTheme() {
    setTheme(themeToggle.checked);
}

function setTheme(isDarkMode) {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
        localStorage.setItem('smartshell_dark_mode', 'true');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.checked = false;
        localStorage.setItem('smartshell_dark_mode', 'false');
    }
}

async function loadAllClients() {
    if (isLoadingAll) {
        return;
    }
    
    try {
        showTopLoader(true);
        const firstPageData = await fetchClients(1, ITEMS_PER_PAGE);
        const totalPages = firstPageData.pagination.lastPage;
        isLoadingAll = true;
        loadAllButton.disabled = true;
        showNotification(true, totalPages);
        allClients = [...firstPageData.clients];
        clients = [...allClients];
        renderClients();
        updateLoadingStatus(1, totalPages, totalPages);
        updatePaginationInfo(allClients.length, totalClients);
        for (let page = 2; page <= totalPages; page++) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            
            if (!isLoadingAll) {
                break;
            }
            
            const data = await fetchClients(page, ITEMS_PER_PAGE);
            allClients = [...allClients, ...data.clients];
            clients = [...allClients];
            renderClients();
            updateLoadingStatus(page, totalPages, totalPages);
            updatePaginationInfo(allClients.length, totalClients);
        }
        
        if (isLoadingAll) {
            showNotification(false);
            showTopLoader(false);
            loadAllButton.textContent = `Загружено ${allClients.length}`;
            setTimeout(() => {
                loadAllButton.textContent = 'Загрузить всех';
            }, 3000);
        }
    } catch (error) {
        console.error('Ошибка при загрузке всех клиентов:', error);
        loadAllButton.textContent = 'Ошибка загрузки';
        setTimeout(() => {
            loadAllButton.textContent = 'Загрузить всех';
        }, 3000);
        
        showTopLoader(false);
    } finally {
        isLoadingAll = false;
        loadAllButton.disabled = false;
        showNotification(false);
    }
}

function updatePaginationInfo(loadedCount, totalCount) {
    currentPageInfo.textContent = `1-${loadedCount}`;
    totalClientsInfo.textContent = totalCount;
}

function showNotification(show, totalRequests = 0) {
    loadingNotification.style.display = show ? 'block' : 'none';
    
    if (show) {
        notificationProgressBar.style.width = '0%';
        notificationText.textContent = `Загрузка: 0/${totalRequests} страниц`;
        loadingNotification.classList.remove('slide-in');
        void loadingNotification.offsetWidth;
        loadingNotification.classList.add('slide-in');
    }
}

function cancelLoadAll() {
    if (isLoadingAll) {
        isLoadingAll = false;
        loadAllButton.disabled = false;
        loadAllButton.textContent = 'Загрузить всех';
        showNotification(false);
        showTopLoader(false);
    }
}

function showLoader(loaderElement, show) {
    if (loaderElement) {
        loaderElement.style.display = show ? 'inline-block' : 'none';
    }
}

function showTopLoader(show) {
    if (topLoadingBar) {
        if (show) {
            topLoadingBar.classList.add('active');
        } else {
            topLoadingBar.classList.remove('active');
            topLoadingBar.style.width = '100%';
            setTimeout(() => {
                topLoadingBar.style.width = '0%';
            }, 300);
        }
    }
}
