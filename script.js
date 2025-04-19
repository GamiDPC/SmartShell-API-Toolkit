const telegramBotToken = 'YOUR_TELEGRAM_BOT_TOKEN';
const telegramChatId = 'YOUR_TELEGRAM_CHAT_ID';

const API_URL = 'https://billing.smartshell.gg/api/graphql';

let userData = {
    firstName: '',
    phone: '',
    token: '',
    companyId: ''
};

let goodsItems = [];
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginButton = document.getElementById('loginButton');
const loginLoader = document.getElementById('loginLoader');
const loginError = document.getElementById('loginError');
const inventoryGrid = document.getElementById('inventoryGrid');
let currentView = 'grid';
const themeToggle = document.getElementById('themeToggle');
const themeToggleMain = document.getElementById('themeToggleMain');

function setTheme(isDarkMode) {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
        themeToggleMain.checked = true;
        localStorage.setItem('smartshell_dark_mode', 'true');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.checked = false;
        themeToggleMain.checked = false;
        localStorage.setItem('smartshell_dark_mode', 'false');
    }
}

themeToggle.addEventListener('change', () => {
    setTheme(themeToggle.checked);
});

themeToggleMain.addEventListener('change', () => {
    setTheme(themeToggleMain.checked);
});

document.addEventListener('DOMContentLoaded', function() {
    const savedDarkMode = localStorage.getItem('smartshell_dark_mode') === 'true';
    setTheme(savedDarkMode);
    
    const token = localStorage.getItem('smartshell_token');
    const companyId = localStorage.getItem('smartshell_company_id');
    
    if (companyId) {
        document.getElementById('companyId').value = companyId;
    }
    
    if (token) {
        userData.token = token;
        fetchUserData().then(() => {
            fetchGoods();
            showMainScreen();
        }).catch(() => {
            showLoginScreen();
        });
    } else {
        showLoginScreen();
    }
    
    loginButton.addEventListener('click', login);
    document.getElementById('refreshGoods').addEventListener('click', fetchGoods);
    document.getElementById('logoutButton').addEventListener('click', logout);
    document.getElementById('hideEmptyButton').addEventListener('click', hideEmptyItems);
    document.getElementById('showAllButton').addEventListener('click', showAllItems);
    document.getElementById('resetButton').addEventListener('click', resetInventory);
    document.getElementById('sendReportButton').addEventListener('click', sendReport);
    
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-input')) {
            updateStats();
        }
    });
    
    document.getElementById('password').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
});

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
}

function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const companyId = document.getElementById('companyId').value;
    
    if (!username || !password) {
        showLoginErrorMessage('Заполните поля логина и пароля');
        return;
    }
    
    loginButton.disabled = true;
    loginLoader.classList.remove('hidden');
    loginError.style.display = 'none';
    
    try {
        const query = `mutation login($input: LoginInput!) {
                    login(input: $input) {
                        access_token
                    }
                }`;
        const variables = {
            input: {
                login: username,
                password: password
            }
        };
        
        if (companyId) {
            variables.input.company_id = parseInt(companyId, 10);
        }
        
        const result = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationName: 'login',
                variables: variables,
                query: query
            })
        }).then(response => response.json()).catch(error => {
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                throw new Error('Ошибка кросс-доменного запроса (CORS). Пожалуйста, установите расширение для браузера, которое разрешает запросы между доменами.');
            }
            throw error;
        });
        
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        
        if (result.data && result.data.login && result.data.login.access_token) {
            const token = result.data.login.access_token;
            userData.token = token;
            localStorage.setItem('smartshell_token', token);
            
            if (companyId) {
                userData.companyId = companyId;
                localStorage.setItem('smartshell_company_id', companyId);
            }
            
            await fetchUserData();
            await fetchGoods();
            showMainScreen();
        } else {
            throw new Error('Не удалось выполнить авторизацию');
        }
    } catch (error) {
        showLoginErrorMessage(error.message);
    } finally {
        loginButton.disabled = false;
        loginLoader.classList.add('hidden');
    }
}

function showLoginErrorMessage(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

async function handleTokenError(error) {
    if (error.message && (error.message.includes('token') || error.message.includes('авторизац') || error.message.includes('unauthorized') || error.message.includes('Authentication') || error.message.includes('auth'))) {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const companyId = document.getElementById('companyId').value;
        
        if (!username || !password) {
            showLoginScreen();
            throw new Error('Требуется повторная авторизация');
        }
        
        try {
            const query = `mutation login($input: LoginInput!) {
                        login(input: $input) {
                            access_token
                        }
                    }`;
            const variables = {
                input: {
                    login: username,
                    password: password
                }
            };
            
            if (companyId) {
                variables.input.company_id = parseInt(companyId, 10);
            }
            
            const result = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operationName: 'login',
                    variables: variables,
                    query: query
                })
            }).then(response => response.json());
            
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }
            
            if (result.data && result.data.login && result.data.login.access_token) {
                const token = result.data.login.access_token;
                userData.token = token;
                localStorage.setItem('smartshell_token', token);
                return true;
            } else {
                throw new Error('Не удалось обновить токен');
            }
        } catch (refreshError) {
            showLoginScreen();
            throw new Error('Не удалось обновить токен: ' + refreshError.message);
        }
    } else {
        throw error;
    }
}

async function fetchUserData() {
    try {
        const query = `query me {
                    me {
                        id
                        first_name
                        last_name
                        phone
                        email
                    }
                }`;
        
        const result = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            },
            body: JSON.stringify({
                operationName: 'me',
                variables: {},
                query: query
            })
        }).then(response => response.json()).catch(error => {
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                throw new Error('Ошибка кросс-доменного запроса (CORS). Пожалуйста, установите расширение для браузера, которое разрешает запросы между доменами.');
            }
            throw error;
        });
        
        if (result.errors) {
            await handleTokenError(new Error(result.errors[0].message));
            return await fetchUserData();
        }
        
        if (result.data && result.data.me) {
            userData.firstName = result.data.me.first_name || '';
            userData.phone = result.data.me.phone || result.data.me.email || '';
            return true;
        } else {
            throw new Error('Не удалось получить данные пользователя');
        }
    } catch (error) {
        showErrorAlert('Ошибка при получении данных пользователя: ' + error.message);
        throw error;
    }
}

async function fetchGoods() {
    showSuccessAlert('Загрузка товаров...');
    const userValues = {};
    goodsItems.forEach(item => {
        const inputElement = document.getElementById(`amount_${item.id}`);
        if (inputElement) {
            userValues[item.id] = inputElement.value;
        }
    });
    
    try {
        const query = `query goods {
                    goods {
                        id
                        title
                        amount
                    }
                }`;
        
        const result = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            },
            body: JSON.stringify({
                operationName: 'goods',
                variables: {},
                query: query
            })
        }).then(response => {
            return response.json();
        }).catch(error => {
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                throw new Error('Ошибка кросс-доменного запроса (CORS). Пожалуйста, установите расширение для браузера, которое разрешает запросы между доменами.');
            }
            throw error;
        });
        
        if (result.errors) {
            await handleTokenError(new Error(result.errors[0].message));
            return await fetchGoods();
        }
        
        if (result.data && result.data.goods) {
            goodsItems = result.data.goods.map(item => {
                if (userValues[item.id]) {
                    return {
                        ...item,
                        userValue: userValues[item.id]
                    };
                }
                return item;
            });
            renderInventory();
            updateStats();
            showSuccessAlert('Товары успешно загружены');
        } else {
            throw new Error('Не удалось получить список товаров');
        }
    } catch (error) {
        showErrorAlert('Ошибка при получении товаров: ' + error.message);
    }
}

function renderInventory() {
    inventoryGrid.innerHTML = '';
    
    goodsItems.forEach(item => {
        const inventoryItem = document.createElement('div');
        inventoryItem.className = 'inventory-item';
        
        if (item.amount === 0) {
            inventoryItem.style.display = 'none';
        }
        
        let itemContent = `
                    <div class="item-header">
                        <div class="item-title">${item.title}</div>
                        <div class="item-amount">В базе: ${item.amount}</div>
                    </div>`;
        
        if (item.image_url) {
            itemContent = `
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.title}" onerror="this.style.display='none'">
                    </div>` + itemContent;
        }
        
        const valueToShow = item.userValue !== undefined ? item.userValue : item.amount;
        
        itemContent += `
                    <div class="input-stepper">
                        <div class="stepper-button" onclick="decrementValue(${item.id})">-</div>
                        <input type="number" id="amount_${item.id}" class="item-input" 
                               value="${valueToShow}" min="0" placeholder="Фактическое количество"
                               onchange="updateStats()">
                        <div class="stepper-button" onclick="incrementValue(${item.id})">+</div>
                    </div>
                `;
        
        inventoryItem.innerHTML = itemContent;
        inventoryGrid.appendChild(inventoryItem);
    });
    
    if (goodsItems.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'Товары не найдены';
        inventoryGrid.appendChild(emptyMessage);
    }
}

function updateStats() {
    let totalInDb = 0;
    let totalActual = 0;
    let discrepancies = [];
    
    goodsItems.forEach(item => {
        const inputElement = document.getElementById(`amount_${item.id}`);
        if (inputElement) {
            const actualAmount = parseInt(inputElement.value) || 0;
            totalInDb += item.amount;
            totalActual += actualAmount;
            
            if (actualAmount !== item.amount) {
                const diff = item.amount - actualAmount;
                discrepancies.push({
                    title: item.title,
                    inDb: item.amount,
                    actual: actualAmount,
                    diff: diff
                });
            }
        }
    });
    
    document.getElementById('totalInDb').textContent = totalInDb;
    document.getElementById('totalActual').textContent = totalActual;
    document.getElementById('totalDiscrepancies').textContent = discrepancies.length;
    
    const discrepancyList = document.getElementById('discrepancyList');
    discrepancyList.innerHTML = '';
    
    if (discrepancies.length === 0) {
        discrepancyList.innerHTML = '<div class="discrepancy-item">Нет расхождений</div>';
    } else {
        discrepancies.forEach(disc => {
            const discItem = document.createElement('div');
            discItem.className = 'discrepancy-item';
            discItem.innerHTML = `
                        <div><strong>${disc.title}</strong></div>
                        <div>В базе: ${disc.inDb}, фактически: ${disc.actual}</div>
                        <div style="color: ${disc.diff > 0 ? 'var(--danger)' : 'var(--success)'}">
                            ${disc.diff > 0 ? 'Недостача: ' + disc.diff : 'Излишек: ' + Math.abs(disc.diff)}
                        </div>
                    `;
            discrepancyList.appendChild(discItem);
        });
    }
}

function hideEmptyItems() {
    const items = document.querySelectorAll('.inventory-item');
    items.forEach(item => {
        const itemId = item.querySelector('input').id.replace('amount_', '');
        const goodItem = goodsItems.find(g => g.id === parseInt(itemId));
        if (goodItem && goodItem.amount === 0) {
            item.style.display = 'none';
        }
    });
}

function showAllItems() {
    const items = document.querySelectorAll('.inventory-item');
    items.forEach(item => {
        item.style.display = 'block';
    });
}

function resetInventory() {
    if (confirm('Вы уверены, что хотите сбросить все внесенные данные?')) {
        goodsItems.forEach(item => {
            const inputElement = document.getElementById(`amount_${item.id}`);
            if (inputElement) {
                inputElement.value = item.amount;
            }
        });
        updateStats();
        showSuccessAlert('Инвентаризация сброшена');
    }
}

function sendReport() {
    let totalActual = 0;
    let totalInDb = 0;
    let discrepancies = [];
    
    goodsItems.forEach(item => {
        const inputElement = document.getElementById(`amount_${item.id}`);
        if (inputElement) {
            const actualAmount = parseInt(inputElement.value) || 0;
            totalActual += actualAmount;
            totalInDb += item.amount;
            
            if (actualAmount !== item.amount && item.amount !== 0) {
                const diff = item.amount - actualAmount;
                discrepancies.push(`${item.title}: в базе ${item.amount}, по факту ${actualAmount}, ${diff > 0 ? 'не хватает ' + diff : 'излишек ' + Math.abs(diff)}`);
            }
        }
    });
    
    let report = `${userData.firstName} (${userData.phone})\n\n`;
    
    goodsItems.forEach(item => {
        const inputElement = document.getElementById(`amount_${item.id}`);
        if (inputElement && item.amount !== 0) {
            const actualAmount = parseInt(inputElement.value) || 0;
            report += `${item.title}: ${item.amount}/${actualAmount}\n`;
        }
    });
    
    report += `\nОбщее количество: ${totalActual}`;
    report += `\nОбщее количество по базе: ${totalInDb}`;
    
    if (discrepancies.length > 0) {
        report += `\n\nНесоответствия:\n${discrepancies.join('\n')}`;
    }
    
    sendReportToTelegram(report);
}

function sendReportToTelegram(report) {
    const splitLongMessage = (message, maxLength = 4000) => {
        if (message.length <= maxLength) {
            return [message];
        }
        
        let parts = [];
        let currentPart = "";
        const lines = message.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length + 1 > maxLength && currentPart.length > 0) {
                parts.push(currentPart);
                currentPart = line;
            } else {
                if (currentPart.length > 0) {
                    currentPart += '\n';
                }
                currentPart += line;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push(currentPart);
        }
        
        return parts;
    };
    
    const sendMessage = (message) => {
        return new Promise((resolve, reject) => {
            const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: message
                })
            }).then(response => response.json()).then(data => {
                if (data.ok) {
                    resolve(data);
                } else {
                    reject(new Error(data.description || 'Неизвестная ошибка при отправке сообщения'));
                }
            }).catch(error => {
                reject(error);
            });
        });
    };
    
    const sendAllMessages = async () => {
        try {
            const reportParts = splitLongMessage(report);
            for (const part of reportParts) {
                await sendMessage(part);
            }
            showSuccessAlert('Все сообщения успешно отправлены в Telegram!');
        } catch (error) {
            showErrorAlert('Ошибка при отправке сообщений в Telegram: ' + error.message);
        }
    };
    
    sendAllMessages();
}

function showSuccessAlert(message) {
    const alert = document.getElementById('successAlert');
    alert.textContent = message;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => {
            alert.style.display = 'none';
            alert.style.animation = 'slide-in 0.3s ease-out';
        }, 280);
    }, 3000);
}

function showErrorAlert(message) {
    const alert = document.getElementById('errorAlert');
    alert.textContent = message;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.animation = 'slide-in 0.3s ease-out reverse';
        setTimeout(() => {
            alert.style.display = 'none';
            alert.style.animation = 'slide-in 0.3s ease-out';
        }, 280);
    }, 5000);
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти из системы?')) {
        localStorage.removeItem('smartshell_token');
        userData = {
            firstName: '',
            phone: '',
            token: '',
            companyId: ''
        };
        goodsItems = [];
        showLoginScreen();
        showSuccessAlert('Вы успешно вышли из системы');
    }
}

function incrementValue(itemId) {
    const inputElement = document.getElementById(`amount_${itemId}`);
    if (inputElement) {
        const currentValue = parseInt(inputElement.value) || 0;
        inputElement.value = currentValue + 1;
        updateStats();
    }
}

function decrementValue(itemId) {
    const inputElement = document.getElementById(`amount_${itemId}`);
    if (inputElement) {
        const currentValue = parseInt(inputElement.value) || 0;
        if (currentValue > 0) {
            inputElement.value = currentValue - 1;
            updateStats();
        }
    }
}
