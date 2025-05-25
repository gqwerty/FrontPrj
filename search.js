const BASE_URL = 'http://61.109.236.163:8000';
let favorites = [];
let isLoggedIn = false;

// Check login status
async function checkLogin() {
    const userEmail = localStorage.getItem('user_email');
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

    if (!userEmail || (Date.now() - loginTime) >= sessionDuration) {
        localStorage.removeItem('user_email');
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
}

// Fetch favorites
async function fetchFavorites() {
    const userId = localStorage.getItem('user_email');
    if (!userId) return [];

    try {
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('즐겨찾기 조회 실패');
        return await response.json();
    } catch (err) {
        console.error('Error:', err);
        return [];
    }
}

// Display favorites in sidebar
function displayFavorites(favorites) {
    const favoritesList = document.getElementById('favorites-list');
    if (!favorites || favorites.length === 0) {
        favoritesList.innerHTML = '<li>즐겨찾기가 없습니다.</li>';
        return;
    }

    favoritesList.innerHTML = favorites.map(ticker => `
        <li>${ticker}</li>
    `).join('');
}

// Search functionality
async function performSearch(companyName) {
    if (!companyName) {
        Swal.fire('오류', '회사명을 입력해주세요.', 'warning');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/stocks/search?name=${encodeURIComponent(companyName)}`);
        if (!response.ok) {
            if (response.status >= 500) throw new Error('server');
            else if (response.status === 404) throw new Error('not_found');
            throw new Error('other');
        }
        const data = await response.json();
        displayStockInfo(data);
    } catch (error) {
        handleSearchError(error);
    }
}

function searchStocks() {
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const companyName = searchBar.value.trim();
            performSearch(companyName);
        }
    });
}

// Display stock info
function displayStockInfo(data) {
    const stockInfoDiv = document.getElementById('stock-info');
    if (!data?.info) {
        stockInfoDiv.innerHTML = '<p>정보를 불러올 수 없습니다.</p>';
        return;
    }

    stockInfoDiv.innerHTML = `
        <h2>${data.company_name} (${data.ticker})</h2>
        <table class="stock-table">
            ${generateTableRows(data.info)}
            <tr>
                <th>즐겨찾기</th>
                <td>
                    <button id="favorite-toggle" class="favorite-icon ${favorites.includes(data.ticker) ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}">
                        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        </table>
    `;

    document.getElementById('favorite-toggle').addEventListener('click', () => toggleFavorite(data.ticker));
}

function generateTableRows(info) {
    const fields = [
        '현재 주가', '전일 종가', '시가', '고가', '저가',
        '52주 최고', '52주 최저', '시가총액', 'PER (Trailing)',
        'PER (Forward)', '거래량', '평균 거래량', '배당 수익률'
    ];
    return fields.map(field => `
        <tr>
            <th>${field}</th>
            <td>${formatFieldValue(info[field], field)}</td>
        </tr>
    `).join('');
}

function formatFieldValue(value, field) {
    if (field.includes('거래량')) return value ? value.toLocaleString() : '-';
    if (field === '배당 수익률') return value ? `${(value * 100).toFixed(2)}%` : '-';
    if (typeof value === 'number') return value.toFixed(2);
    return value || '-';
}

// Toggle favorite
async function toggleFavorite(ticker) {
    if (!(await checkLogin())) {
        Swal.fire('로그인 필요', '즐겨찾기 추가를 위해 로그인이 필요합니다.', 'warning');
        return;
    }

    const userId = localStorage.getItem('user_email');
    const isFavorited = favorites.includes(ticker);

    try {
        const response = await fetch(`${BASE_URL}/update_subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                company_name: ticker,
                subscription: !isFavorited
            })
        });

        if (!response.ok) throw new Error('처리 실패');
        favorites = isFavorited
            ? favorites.filter(t => t !== ticker)
            : [...favorites, ticker];

        updateFavoriteButton(ticker);
        displayFavorites(favorites);
    } catch (err) {
        Swal.fire('오류', `즐겨찾기 처리 중 오류: ${err.message}`, 'error');
    }
}

function updateFavoriteButton(ticker) {
    const btn = document.getElementById('favorite-toggle');
    if (!btn) return;

    const isFavorited = favorites.includes(ticker);
    btn.className = `favorite-icon ${isFavorited ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}`;
}

function setupSidebarToggles() {
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    const sidebar = document.getElementById('sidebar');
    const settingsSidebar = document.getElementById('settings-sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            console.log('Toggling favorites sidebar');
            sidebar.classList.toggle('open');
            document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
        });
    }

    if (settingsToggle && settingsSidebar) {
        settingsToggle.addEventListener('click', () => {
            console.log('Toggling settings sidebar');
            settingsSidebar.classList.toggle('open');
            document.body.classList.toggle('settings-sidebar-open', settingsSidebar.classList.contains('open'));
        });
    }
}

// Toggle theme
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    body.classList.toggle('dark-mode', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
}

// Set default refresh interval
function setDefaultRefreshInterval() {
    const interval = document.getElementById('default-refresh-interval').value;
    console.log(`Default refresh interval set to ${interval}`);
    // TODO: Implement default refresh logic
}

// Logout
function logout() {
    localStorage.removeItem('user_email');
    localStorage.removeItem('loginTime');
    isLoggedIn = false;
    document.getElementById('signup-btn').style.display = 'inline-block';
    document.getElementById('login-btn').style.display = 'inline-block';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('menu-toggle').style.display = 'none';
    document.getElementById('settings-toggle').style.display = 'none';
    Swal.fire('로그아웃', '성공적으로 로그아웃했습니다.', 'success');
}

// Error handling
function handleSearchError(error) {
    const messages = {
        'server': '서버 오류입니다.',
        'not_found': '회사 정보를 찾을 수 없습니다.',
        'other': '오류가 발생했습니다.'
    };
    Swal.fire('오류', messages[error.message] || messages.other, 'error');
}

// Initialize
async function init() {
    isLoggedIn = await checkLogin();
    favorites = await fetchFavorites();

    if (isLoggedIn) {
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('menu-toggle').style.display = 'inline-flex';
        document.getElementById('settings-toggle').style.display = 'inline-flex';
    }

    searchStocks();
    setupSidebarToggles();
    displayFavorites(favorites);

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            document.getElementById('search-bar').value = decodeURIComponent(query);
            performSearch(decodeURIComponent(query));
        }
    } catch (err) {
        console.error('Error parsing query parameter:', err);
        Swal.fire('오류', '검색 쿼리 처리 중 오류가 발생했습니다.', 'error');
    }
}

// Run initialization
document.addEventListener('DOMContentLoaded', init);
