document.getElementById("search-button").addEventListener("click", function () {
    const companyName = document.getElementById("search-input").value;

    if (!companyName) {
        alert("회사명을 입력해주세요.");
        return;
    }

    fetch(`/stocks/search?name=${companyName}`)
        .then(response => {
            if (!response.ok) {
                // 서버 오류
                if (response.status >= 500) {
                    throw new Error("server");
                }
                // 검색 결과 없음 (404)
                else if (response.status === 404) {
                    throw new Error("not_found");
                }
                // 그 외 오류
                else {
                    throw new Error("other");
                }
            }
            return response.json();
        })
        .then(data => {
            displayStockInfo(data);
        })
        .catch(error => {
            if (error.message === "server") {
                alert("서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
            } else if (error.message === "not_found") {
                alert("검색한 회사 정보를 찾을 수 없습니다.");
            } else {
                alert("검색 중 오류가 발생했습니다. 다시 시도해 주세요.");
            }
            console.error("Error:", error);
        });
});

function displayStockInfo(data) {
    const stockInfoDiv = document.getElementById("stock-info");

    if (data) {
        stockInfoDiv.innerHTML = `
            <h2>${data.company_name} (${data.ticker})</h2>
            <p>현재 주가: ${data.price} 원</p>
            <p>전일대비 변동: ${data.daily_change} 원</p>
            <p>PER: ${data.per}</p>
            <p>평균 거래량: ${data.average_volume}</p>
        `;
    } else {
        stockInfoDiv.innerHTML = "<p>검색한 회사 정보를 찾을 수 없습니다.</p>";
    }
}
