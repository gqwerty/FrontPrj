const BASE_URL = 'http://61.109.236.163:8000';
let favorites = [];
let isLoggedIn = false;

// ================= 공통 함수 =================
async function checkLogin() {
    const userEmail = localStorage.getItem('user_email');
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24시간

    if (!userEmail || (Date.now() - loginTime) >= sessionDuration) {
        localStorage.removeItem('user_email');
        localStorage.removeItem('loginTime');
        return false;
    }
    return true;
}

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

// ================= 검색 기능 ================= (기존 코드 유지)
document.getElementById("search-button").addEventListener("click", async function () {
    const companyName = document.getElementById("search-input").value;
    if (!companyName) {
        alert("회사명을 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/stocks/search?name=${encodeURIComponent(companyName)}`);
        if (!response.ok) {
            if (response.status >= 500) throw new Error("server");
            else if (response.status === 404) throw new Error("not_found");
            throw new Error("other");
        }
        const data = await response.json();
        displayStockInfo(data);
    } catch (error) {
        handleSearchError(error);
    }
});

function displayStockInfo(data) {
    const stockInfoDiv = document.getElementById("stock-info");
    if (!data?.info) {
        stockInfoDiv.innerHTML = "<p>정보를 불러올 수 없습니다.</p>";
        return;
    }

    stockInfoDiv.innerHTML = `
        <h2>${data.company_name} (${data.ticker})</h2>
        <table class="stock-table">
            ${generateTableRows(data.info)}
            <tr>
                <th>즐겨찾기</th>
                <td>
                    <button id="favorite-toggle" class="${favorites.includes(data.ticker) ? 'active' : ''}">
                        ${favorites.includes(data.ticker) ? '⭐' : '☆'}
                    </button>
                </td>
            </tr>
        </table>
    `;

    document.getElementById("favorite-toggle").addEventListener("click", () => toggleFavorite(data.ticker));
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
    if (field.includes('거래량')) return value.toLocaleString();
    if (field === '배당 수익률') return `${(value * 100).toFixed(2)}%`;
    if (typeof value === 'number') return value.toFixed(2);
    return value || '-';
}

// ================= 즐겨찾기 기능 =================
async function toggleFavorite(ticker) {
    if (!(await checkLogin())) {
        alert("로그인이 필요합니다.");
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
    } catch (err) {
        alert(`오류: ${err.message}`);
    }
}

function updateFavoriteButton(ticker) {
    const btn = document.getElementById("favorite-toggle");
    if (!btn) return;

    const isFavorited = favorites.includes(ticker);
    btn.className = isFavorited ? 'active' : '';
    btn.innerHTML = isFavorited ? '⭐' : '☆';
}

// ================= 초기화 =================
async function init() {
    isLoggedIn = await checkLogin();
    favorites = await fetchFavorites();

    // 즐겨찾기 팝업 이벤트 (기존 코드 유지)
    document.getElementById("favorite-btn").addEventListener("click", showFavoritesPopup);
    document.getElementById("close-popup").addEventListener("click", () => {
        document.getElementById("favorite-popup").classList.add("hidden");
    });
}

// ================= 에러 처리 =================
function handleSearchError(error) {
    const messages = {
        "server": "서버 오류입니다.",
        "not_found": "회사 정보를 찾을 수 없습니다.",
        "other": "오류가 발생했습니다."
    };
    alert(messages[error.message] || messages.other);
}

// 실행
init();
