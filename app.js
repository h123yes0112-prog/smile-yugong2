/**
 * 《愚公移山》 售票網站 互動邏輯 & 票價試算器
 */

// ==========================================
// 1. Google 表單與預填參數設定
// ==========================================
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfHC2WRZ6fECdxZdP5_dW8fke2pgtv1MWTfQ-mFY4f8EFH6Sw/viewform";

const GOOGLE_FORM_ENTRIES = {
    session: "entry.317941617",     // 場次
    totalPrice: "entry.1771555776"  // 應匯款總金額
};

// ==========================================
// 2. 狀態管理
// ==========================================
let bookingState = {
    selectedSession: "",
    sessionInventory: {
        "10/18 11:30": 100,
        "10/18 14:00": 100
    },
    tickets: {
        "微笑姐姐新頻道專屬優惠": { price: 370, qty: 0 },
        "中秋節雙人優惠": { price: 800, qty: 0 },
        "一般票券": { price: 450, qty: 0 }
    },
    totalQuantity: 0,
    totalPrice: 0
};

// ==========================================
// 3. 初始化 DOM 元素
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const sessionSelect = document.getElementById("session-select");
    const calcSessionDisp = document.getElementById("calc-session");
    const calcQtyDisp = document.getElementById("calc-qty");
    const calcBreakdownDisp = document.getElementById("calc-breakdown");
    const calcTotalDisp = document.getElementById("calc-total");
    const stickyTotalVal = document.getElementById("sticky-total-val");
    const stickyBtnText = document.getElementById("sticky-btn-text");
    const stickyActionBtn = document.getElementById("sticky-action-btn");
    const btnSubmitBooking = document.getElementById("btn-submit-booking");

    // ==========================================
    // 3.5 幻燈片輪播邏輯 (Hero Slideshow)
    // ==========================================
    const slideshowImages = document.querySelectorAll("#hero-slideshow .poster-img");
    if (slideshowImages.length > 0) {
        let currentSlideIndex = 0;
        setInterval(() => {
            slideshowImages[currentSlideIndex].classList.remove("active");
            currentSlideIndex = (currentSlideIndex + 1) % slideshowImages.length;
            slideshowImages[currentSlideIndex].classList.add("active");
        }, 3000); // 切換時間：3秒
    }

    // ==========================================
    // 4. 事件監聽設定
    // ==========================================
    
    // 監聽場次選擇
    sessionSelect.addEventListener("change", (e) => {
        bookingState.selectedSession = e.target.value;
        // 切換場次時重置已選票數
        for (const key in bookingState.tickets) {
            bookingState.tickets[key].qty = 0;
        }
        document.querySelectorAll(".qty-val").forEach(el => el.textContent = "0");
        calculateTotals();
        updateUI();
    });

    // 監聽票券數量加減按鈕
    const ticketCards = document.querySelectorAll(".ticket-card");
    ticketCards.forEach(card => {
        const ticketName = card.getAttribute("data-name");
        const btnMinus = card.querySelector(".btn-minus");
        const btnPlus = card.querySelector(".btn-plus");
        const qtyValDisp = card.querySelector(".qty-val");

        // 減少數量
        btnMinus.addEventListener("click", () => {
            if (bookingState.tickets[ticketName].qty > 0) {
                bookingState.tickets[ticketName].qty--;
                qtyValDisp.textContent = bookingState.tickets[ticketName].qty;
                calculateTotals();
                updateUI();
            }
        });

        // 增加數量
        btnPlus.addEventListener("click", () => {
            if (!bookingState.selectedSession) {
                alert("請先選擇演出場次！");
                return;
            }
            
            let seatsPerTicket = (ticketName.includes("雙人") || ticketName.includes("親子")) ? 2 : 1;
            let currentRemaining = bookingState.sessionInventory[bookingState.selectedSession] - (bookingState.totalSeats || 0);

            // 限制單次購票上限，並確認是否有足夠剩餘席次
            if (bookingState.tickets[ticketName].qty < 10 && currentRemaining >= seatsPerTicket) {
                bookingState.tickets[ticketName].qty++;
                qtyValDisp.textContent = bookingState.tickets[ticketName].qty;
                calculateTotals();
                updateUI();
            } else if (currentRemaining < seatsPerTicket) {
                alert("本場次剩餘席次不足！");
            }
        });
    });

    // 監聽結帳送出按鈕
    btnSubmitBooking.addEventListener("click", () => {
        redirectToGoogleForm();
    });

    // 置底行動列的按鈕行為
    stickyActionBtn.addEventListener("click", (e) => {
        // 如果還沒有選票或場次，只進行平滑滾動到購票區
        if (bookingState.totalQuantity === 0 || !bookingState.selectedSession) {
            return; // 讓 <a> 標籤的 href="#tickets" 發揮效果進行錨點跳轉
        }
        
        // 如果已經選好票與場次，直接觸發轉向 Google 表單
        e.preventDefault();
        redirectToGoogleForm();
    });

    // ==========================================
    // 5. 核心運算邏輯
    // ==========================================
    
    // 計算總數量與總金額
    function calculateTotals() {
        let totalQty = 0;
        let totalPrice = 0;
        let totalSeats = 0;
        
        for (const key in bookingState.tickets) {
            const ticket = bookingState.tickets[key];
            totalQty += ticket.qty;
            totalPrice += ticket.qty * ticket.price;
            
            let seatsPerTicket = (key.includes("雙人") || key.includes("親子")) ? 2 : 1;
            totalSeats += ticket.qty * seatsPerTicket;
        }
        
        bookingState.totalQuantity = totalQty;
        bookingState.totalPrice = totalPrice;
        bookingState.totalSeats = totalSeats;
    }

    // 更新網頁顯示資訊
    function updateUI() {
        const inventoryStatus = document.getElementById("inventory-status");
        const remainingTicketsDisp = document.getElementById("remaining-tickets");

        // 更新場次與庫存顯示
        if (bookingState.selectedSession) {
            calcSessionDisp.textContent = bookingState.selectedSession;
            calcSessionDisp.classList.remove("text-muted");
            
            inventoryStatus.style.display = "block";
            const remaining = bookingState.sessionInventory[bookingState.selectedSession] - (bookingState.totalSeats || 0);
            remainingTicketsDisp.textContent = remaining;
        } else {
            calcSessionDisp.textContent = "尚未選擇";
            inventoryStatus.style.display = "none";
        }

        // 更新總票數與總金額
        calcQtyDisp.textContent = bookingState.totalQuantity;
        calcTotalDisp.textContent = formatNumber(bookingState.totalPrice);
        stickyTotalVal.textContent = formatNumber(bookingState.totalPrice);

        // 更新明細列表
        calcBreakdownDisp.innerHTML = "";
        let hasTickets = false;

        for (const name in bookingState.tickets) {
            const ticket = bookingState.tickets[name];
            if (ticket.qty > 0) {
                hasTickets = true;
                const item = document.createElement("div");
                item.className = "breakdown-item";
                item.innerHTML = `
                    <span>${name} x ${ticket.qty}</span>
                    <span>NT$ ${formatNumber(ticket.qty * ticket.price)}</span>
                `;
                calcBreakdownDisp.appendChild(item);
            }
        }

        if (!hasTickets) {
            calcBreakdownDisp.innerHTML = `<span class="text-muted">（未選擇任何票券）</span>`;
        }

        // 判斷是否滿足結帳條件 (選了場次且票數 > 0)
        const isReady = bookingState.selectedSession !== "" && bookingState.totalQuantity > 0;
        
        if (isReady) {
            btnSubmitBooking.removeAttribute("disabled");
            btnSubmitBooking.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i> 開啟 Google 表單完成登記與對帳`;
            
            stickyBtnText.textContent = "前往 Google 表單";
            stickyActionBtn.style.background = "linear-gradient(135deg, #ff6b35, #ff844b)";
        } else {
            btnSubmitBooking.setAttribute("disabled", "true");
            
            // 提示字調整
            if (!bookingState.selectedSession && bookingState.totalQuantity > 0) {
                btnSubmitBooking.textContent = "請選擇演出場次";
            } else if (bookingState.selectedSession && bookingState.totalQuantity === 0) {
                btnSubmitBooking.textContent = "請至少選擇一張票券";
            } else {
                btnSubmitBooking.textContent = "請先選擇場次與票券數量";
            }
            
            stickyBtnText.textContent = "選擇票券";
            stickyActionBtn.style.background = "var(--primary)";
        }
    }

    // 格式化數字為千分位
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // ==========================================
    // 6. 轉向 Google 表單帶入預填資料
    // ==========================================
    function redirectToGoogleForm() {
        if (!bookingState.selectedSession || bookingState.totalQuantity === 0) {
            alert("請先選擇演出場次與票券數量！");
            return;
        }

        const params = new URLSearchParams();
        params.append("usp", "pp_url");

        // 自動帶入預填參數（場次與總金額）
        params.append(GOOGLE_FORM_ENTRIES.session, bookingState.selectedSession);
        params.append(GOOGLE_FORM_ENTRIES.totalPrice, bookingState.totalPrice);

        const targetUrl = `${GOOGLE_FORM_URL}?${params.toString()}`;
        
        // 在新分頁中開啟 Google 表單
        window.open(targetUrl, "_blank");
    }
});

