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

// Fetch top 10 stocks
async function fetchTopStocks() {
    try {
        const response = await fetch(`${BASE_URL}/top_stocks`);
        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            throw new Error(`상위 주식 조회 실패: ${response.status}`);
        }
        const data = await response.json();
        console.log('Top stocks data:', data);
        return data.top_stocks || [];
    } catch (err) {
        console.error('Error fetching top stocks:', err);
        Swal.fire('오류', `상위 주식 데이터를 불러오지 못했습니다: ${err.message}`, 'error');
        return [];
    }
}

// Display top stocks
function displayTopStocks(stocks) {
    const stockList = document.getElementById('stock-list');
    if (!stocks || stocks.length === 0) {
        stockList.innerHTML = '<tr><td colspan="4">데이터를 불러올 수 없습니다.</td></tr>';
        return;
    }

    stockList.innerHTML = stocks.map(stock => `
        <tr>
            <td>${stock.company_name || 'N/A'}</td>
            <td>${formatFieldValue(stock.price, '현재 주가')}</td>
            <td>${formatFieldValue(stock.volume, '거래량')}</td>
            <td>
                <button class="favorite-icon ${favorites.includes(stock.ticker) ? 'favorite' : ''} ${!isLoggedIn ? 'disabled' : ''}" 
                        onclick="toggleFavorite('${stock.ticker}')">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// Format field value
function formatFieldValue(value, field) {
    if (!value) return '-';
    if (field.includes('거래량')) {
        const numValue = parseFloat(value.replace('M', '')) * 1000000;
        return numValue.toLocaleString();
    }
    if (field === '배당 수익률') return `${(parseFloat(value) * 100).toFixed(2)}%`;
    return parseFloat(value).toFixed(2);
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

        displayTopStocks(await fetchTopStocks());
        displayFavorites(favorites);
    } catch (err) {
        Swal.fire('오류', `즐겨찾기 처리 중 오류: ${err.message}`, 'error');
    }
}

// Search functionality
function searchStocks() {
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const companyName = searchBar.value.trim();
            if (!companyName) {
                Swal.fire('오류', '회사명을 입력해주세요.', 'warning');
                return;
            }
            const redirectUrl = `search.html?q=${encodeURIComponent(companyName)}`;
            console.log('Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }
    });
}

// Toggle sidebars
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

// Placeholder for sortStocks
function sortStocks() {
    const sortOption = document.getElementById('sort-option').value;
    console.log(`Sorting by ${sortOption}`);
    // TODO: Implement sorting logic
}

// Placeholder for setRefreshInterval
function setRefreshInterval() {
    const interval = document.getElementById('refresh-interval').value;
    console.log(`Refresh interval set to ${interval}`);
    // TODO: Implement refresh logic
}

// Placeholder for prevPage
function prevPage() {
    console.log('Previous page');
    // TODO: Implement pagination logic
}

// Placeholder for nextPage
function nextPage() {
    console.log('Next page');
    // TODO: Implement pagination logic
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
    const topStocks = await fetchTopStocks();
    displayTopStocks(topStocks);
}

// Run initialization
document.addEventListener('DOMContentLoaded', init);
