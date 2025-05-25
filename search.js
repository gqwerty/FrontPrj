document.getElementById("search-button").addEventListener("click", function () {
    const companyName = document.getElementById("search-input").value;

    if (!companyName) {
        alert("회사명을 입력해주세요.");
        return;
    }

    fetch(`http://61.109.236.163:8000/stocks/search?name=${encodeURIComponent(companyName)}`)
        .then(response => {
            if (!response.ok) {
                if (response.status >= 500) throw new Error("server");
                else if (response.status === 404) throw new Error("not_found");
                else throw new Error("other");
            }
            return response.json();
        })
        .then(data => {
            displayStockInfo(data);
        })
        .catch(error => {
            if (error.message === "server") alert("서버 오류입니다.");
            else if (error.message === "not_found") alert("회사 정보를 찾을 수 없습니다.");
            else alert("오류가 발생했습니다.");
        });
});

function displayStockInfo(data) {
    const stockInfoDiv = document.getElementById("stock-info");

    if (data && data.info) {
        stockInfoDiv.innerHTML = `
            <h2>${data.company_name} (${data.ticker})</h2>
            <table class="stock-table">
              <tr><th>현재 주가</th><td>${data.info["현재 주가"]} 원</td></tr>
              <tr><th>전일 종가</th><td>${data.info["전일 종가"]} 원</td></tr>
              <tr><th>시가</th><td>${data.info["시가"]} 원</td></tr>
              <tr><th>고가</th><td>${data.info["고가"]} 원</td></tr>
              <tr><th>저가</th><td>${data.info["저가"]} 원</td></tr>
              <tr><th>52주 최고</th><td>${data.info["52주 최고"]} 원</td></tr>
              <tr><th>52주 최저</th><td>${data.info["52주 최저"]} 원</td></tr>
              <tr><th>시가총액</th><td>${data.info["시가총액"].toLocaleString()} 원</td></tr>
              <tr><th>PER (Trailing)</th><td>${data.info["PER (Trailing)"]}</td></tr>
              <tr><th>PER (Forward)</th><td>${data.info["PER (Forward)"]}</td></tr>
              <tr><th>거래량</th><td>${data.info["거래량"].toLocaleString()}</td></tr>
              <tr><th>평균 거래량</th><td>${data.info["평균 거래량"].toLocaleString()}</td></tr>
              <tr><th>배당 수익률</th><td>${(data.info["배당 수익률"] * 100).toFixed(2)}%</td></tr>
            </table>
        `;
    } else {
        stockInfoDiv.innerHTML = "<p>정보를 불러올 수 없습니다.</p>";
    }
}

// 즐겨찾기 팝업 처리
const favoriteBtn = document.getElementById("favorite-btn");
const popup = document.getElementById("favorite-popup");
const closePopup = document.getElementById("close-popup");
const favoriteList = document.getElementById("favorite-list");

// 사용자 ID (임시 값)
const userId = "user003";

favoriteBtn.addEventListener("click", () => {
    fetch(`http://61.109.236.163:8000/favorites?user_id=${userId}`)
        .then(async res => {
            if (!res.ok) {
                const err = await res.json();
                if (res.status === 400) throw new Error(err.error || "잘못된 요청입니다.");
                if (res.status === 404) throw new Error(err.error || "사용자를 찾을 수 없습니다.");
                throw new Error("알 수 없는 오류입니다.");
            }
            return res.json();
        })
        .then(data => {
            favoriteList.innerHTML = "";

            if (data.length === 0) {
                favoriteList.innerHTML = "<li>즐겨찾기가 없습니다.</li>";
            } else {
                data.forEach(item => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <strong>${item.company_name}</strong><br/>
                        구독 여부: ${item.subscriptoin ? "✅" : "❌"} / 알림 설정: ${item.notification ? "🔔" : "🔕"}
                    `;
                    favoriteList.appendChild(li);
                });
            }

            popup.classList.remove("hidden");
        })
        .catch(err => {
            alert(`오류: ${err.message}`);
            console.error(err);
        });
});

closePopup.addEventListener("click", () => {
    popup.classList.add("hidden");
});

// 홈/설정 버튼
document.getElementById("home-btn").addEventListener("click", () => {
    location.href = "search.html";
});

document.getElementById("settings-btn").addEventListener("click", () => {
    alert("설정 페이지는 준비 중입니다.");
});
