const BASE_URL = 'http://61.109.236.163:8000'; // 백엔드 서버 주소
let stocks = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentSort = 'volume';
let searchQuery = '';
let favorites = [];
let isSidebarOpen = false;
let isSettingsSidebarOpen = false;
let refreshIntervalId = null;

// 로그인 상태 확인
function isLoggedIn() {
    return !!localStorage.getItem('user_id');
}

// 사용자 설정 로드
function loadUserSettings() {
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const settings = JSON.parse(localStorage.getItem(`settings_${userId}`) || '{}');
        const defaultRefreshInterval = settings.defaultRefreshInterval || '0';
        document.getElementById('default-refresh-interval').value = defaultRefreshInterval;
        const refreshInterval = localStorage.getItem('refreshInterval') || '0';
        document.getElementById('refresh-interval').value = refreshInterval;
        setRefreshInterval();
        if (settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').checked = true;
        } else {
            document.getElementById('theme-toggle').checked = false;
        }
    } else {
        document.getElementById('refresh-interval').value = '0';
        setRefreshInterval();
    }
}

// 사용자 설정 저장
function saveUserSettings() {
    const userId = localStorage.getItem('user_id');
    if (userId) {
        const settings = {
            defaultRefreshInterval: document.getElementById('default-refresh-interval').value,
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
        };
        localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
        fetch(`${BASE_URL}/api/user/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, settings })
        }).catch(err => console.error('DB 저장 실패:', err));
    }
}

// 테마 토글
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    saveUserSettings();
}

// UI 업데이트
function updateUI() {
    const signupBtn = document.getElementById('signup-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const settingsToggle = document.getElementById('settings-toggle');
    if (isLoggedIn()) {
        signupBtn.style.display = 'none';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        menuToggle.style.display = 'inline-flex';
        settingsToggle.style.display = 'inline-flex';
        loadUserSettings();
    } else {
        signupBtn.style.display = 'inline-block';
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        menuToggle.style.display = 'none';
        settingsToggle.style.display = 'none';
        isSidebarOpen = false;
        isSettingsSidebarOpen = false;
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('settings-sidebar').classList.remove('open');
        document.querySelector('header').classList.remove('sidebar-open', 'settings-sidebar-open');
        document.getElementById('refresh-interval').value = '0';
        setRefreshInterval();
    }
}

// 로그아웃
function logout() {
    saveUserSettings();
    localStorage.removeItem('user_id');
    localStorage.removeItem('refreshInterval');
    favorites = [];
    isSidebarOpen = false;
    isSettingsSidebarOpen = false;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('settings-sidebar').classList.remove('open');
    document.querySelector('header').classList.remove('sidebar-open', 'settings-sidebar-open');
    updateUI();
    loadStocks();
    Swal.fire({
        icon: 'success',
        title: '로그아웃',
        text: '로그아웃되었습니다.',
    });
}

/*// 주식 데이터 가져오기
async function fetchStocks() {
    try {
        const response = await fetch(`${BASE_URL}/top_stocks`);
        if (!response.ok) throw new Error('주식 데이터 조회 실패');
        const data = await response.json();
        stocks = data.top_stocks.map((stock, index) => ({
            id: index + 1,
            ticker: stock.ticker,
            name: stock.company_name,
            price: parseFloat(stock.price) || 0,
            volume: parseInt(stock.volume.replace(/,/g, '')) || 0
        }));
        loadStocks();
    } catch (err) {
        console.error('주식 데이터 조회 실패:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '주식 데이터를 불러오지 못했습니다.',
        });
    }
}*/
// 주식 데이터 가져오기
async function fetchStocks() {
    try {
        const response = await fetch(`${BASE_URL}/top_stocks`);
        if (!response.ok) throw new Error('주식 데이터 조회 실패');
        const data = await response.json();
        console.log('Fetched stocks:', data.top_stocks); // 디버깅 로그
        stocks = data.top_stocks.map((stock, index) => ({
            id: index + 1,
            ticker: stock.ticker,
            name: stock.company_name, // 회사 이름 확인
            price: parseFloat(stock.price) || 0,
            volume: parseInt(stock.volume.replace(/,/g, '')) || 0
        }));
        loadStocks();
    } catch (err) {
        console.error('주식 데이터 조회 실패:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '주식 데이터를 불러오지 못했습니다.',
        });
    }
}

// 즐겨찾기 목록 조회
async function fetchFavorites() {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    try {
        const response = await fetch(`${BASE_URL}/favorites?user_id=${userId}`);
        if (!response.ok) throw new Error('즐겨찾기 조회 실패');
        const data = await response.json();
        favorites = data.map(fav => fav.subscription);
        if (isSidebarOpen) {
            renderFavorites();
        }
        loadStocks();
    } catch (err) {
        console.error('즐겨찾기 조회 실패:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '즐겨찾기 목록을 불러오지 못했습니다.',
        });
    }
}

// 즐겨찾기 토글
async function toggleFavorite(ticker) {
    if (!isLoggedIn()) {
        Swal.fire({
            icon: 'warning',
            title: '로그인 필요',
            text: '즐겨찾기 기능은 로그인 후 사용 가능합니다.',
        });
        return;
    }

    const userId = localStorage.getItem('user_id');
    const isFavorited = favorites.includes(ticker);
    try {
        if (isFavorited) {
            const response = await fetch(`${BASE_URL}/favorites/${ticker}?user_id=${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('즐겨찾기 삭제 실패');
            favorites = favorites.filter(t => t !== ticker);
        } else {
            const stock = stocks.find(s => s.ticker === ticker);
            const response = await fetch(`${BASE_URL}/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    company_name: stock.name,
                    subscription: ticker,
                    notification: false
                })
            });
            if (!response.ok) throw new Error('즐겨찾기 추가 실패');
            favorites.push(ticker);
        }
        loadStocks();
        if (isSidebarOpen) {
            renderFavorites();
        }
        Swal.fire({
            icon: 'success',
            title: isFavorited ? '즐겨찾기 해제' : '즐겨찾기 등록',
            text: `종목 ${ticker}이 ${isFavorited ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.'}`,
        });
    } catch (err) {
        console.error('즐겨찾기 처리 실패:', err);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: `즐겨찾기 ${isFavorited ? '삭제' : '추가'}에 실패했습니다.`,
        });
    }
}

// 사이드바 즐겨찾기 렌더링
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        const li = document.createElement('li');
        li.textContent = '즐겨찾기한 종목이 없습니다.';
        favoritesList.appendChild(li);
        return;
    }
    favorites.forEach(ticker => {
        const stock = stocks.find(s => s.ticker === ticker);
        if (stock) {
            const li = document.createElement('li');
            li.className = 'favorite-item';
            li.innerHTML = `
                <span>${stock.name}</span>
                <button class="remove-favorite" onclick="event.stopPropagation(); toggleFavorite('${stock.ticker}')">
                    <svg viewBox="0 0 24 24">
                        <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z" fill="${favorites.includes(stock.ticker) ? '#f00' : '#ccc'}"/>
                    </svg>
                </button>
            `;
            favoritesList.appendChild(li);
        }
    });
}

// 좌측 사이드바 토글
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const header = document.querySelector('header');
    if (isSidebarOpen) {
        sidebar.classList.add('open');
        header.classList.add('sidebar-open');
        fetchFavorites();
    } else {
        sidebar.classList.remove('open');
        header.classList.remove('sidebar-open');
    }
}

// 우측 사이드바 토글
function toggleSettingsSidebar() {
    isSettingsSidebarOpen = !isSettingsSidebarOpen;
    const settingsSidebar = document.getElementById('settings-sidebar');
    const header = document.querySelector('header');
    if (isSettingsSidebarOpen) {
        settingsSidebar.classList.add('open');
        header.classList.add('settings-sidebar-open');
    } else {
        settingsSidebar.classList.remove('open');
        header.classList.remove('settings-sidebar-open');
    }
}

// 주식 목록 렌더링
function loadStocks() {
    const stockList = document.getElementById('stock-list');
    stockList.innerHTML = '';

    let filteredStocks = stocks.filter(stock =>
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (currentSort === 'volume') {
        filteredStocks.sort((a, b) => b.volume - a.volume);
    } else {
        filteredStocks.sort((a, b) => b.price - a.price);
    }

    const totalPages = Math.ceil(filteredStocks.length / rowsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedStocks = filteredStocks.slice(start, end);

    paginatedStocks.forEach(stock => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        // 디버깅: 회사 이름 출력
        console.log(`Navigating to search.html with name: ${stock.name}`);
        row.onclick = () => window.location.href = `../templates/search.html?name=${encodeURIComponent(stock.name)}`;
        const isFavorited = favorites.includes(stock.ticker);
        row.innerHTML = `
            <td>${stock.name}</td>
            <td>${stock.price.toFixed(2)}</td>
            <td>${stock.volume.toLocaleString()}</td>
            <td>
                <svg class="favorite-icon ${isFavorited ? 'favorite' : ''} ${!isLoggedIn() ? 'disabled' : ''}" 
                     onclick="event.stopPropagation(); toggleFavorite('${stock.ticker}')"
                     viewBox="0 0 24 24">
                    <path d="M17 3H7a2 2 0 0 0-2 2v16l7-5 7 5V5a2 2 0 0 0-2-2z"/>
                </svg>
            </td>
        `;
        stockList.appendChild(row);
    });

    document.getElementById('page-info').textContent = `${currentPage} / ${totalPages || 1}`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages;
}

// 검색
function searchStocks() {
    searchQuery = document.getElementById('search-bar').value;
    currentPage = 1;
    loadStocks();
}

// 정렬
function sortStocks() {
    currentSort = document.getElementById('sort-option').value;
    currentPage = 1;
    loadStocks();
}

// 페이지 이동
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadStocks();
    }
}

function nextPage() {
    const totalPages = Math.ceil(
        stocks.filter(stock =>
            stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stock.ticker.toLowerCase().includes(searchQuery.toLowerCase())
        ).length / rowsPerPage
    );
    if (currentPage < totalPages) {
        currentPage++;
        loadStocks();
    }
}

// 새로고침 간격 설정
function setRefreshInterval() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
    const interval = parseInt(document.getElementById('refresh-interval').value) * 1000;
    localStorage.setItem('refreshInterval', interval / 1000);
    if (interval > 0) {
        refreshIntervalId = setInterval(refreshPage, interval);
    }
}

// 사이드바 기본 새로고침 간격 설정
function setDefaultRefreshInterval() {
    saveUserSettings();
}

// 새로고침 (API 호출로 주식 데이터 갱신)
let startTime = Date.now();
async function refreshPage() {
    startTime = Date.now();
    await fetchStocks();
}

// 로컬스토리지 데이터 마이그레이션
async function migrateLocalFavorites() {
    const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (localFavorites.length > 0 && isLoggedIn()) {
        const userId = localStorage.getItem('user_id');
        try {
            for (const ticker of localFavorites) {
                const stock = stocks.find(s => s.ticker === ticker);
                if (stock) {
                    await fetch(`${BASE_URL}/favorites`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: userId,
                            company_name: stock.name,
                            subscription: ticker,
                            notification: false
                        })
                    });
                }
            }
            localStorage.removeItem('favorites');
            await fetchFavorites();
        } catch (err) {
            console.error('마이그레이션 실패:', err);
        }
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    updateUI();
    await fetchStocks();
    if (isLoggedIn()) {
        await migrateLocalFavorites();
        await fetchFavorites();
    }
    loadStocks();
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('settings-toggle').addEventListener('click', toggleSettingsSidebar);
});
