import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["day"]
  static values = { selectedDate: String }

  connect() {
    this.selectedDates = new Set()
    this.lastClickedDate = null

    // 초기 선택
    const dateToSelect = this.selectedDateValue || new Date().toISOString().split("T")[0]
    this.selectedDates.add(dateToSelect)
    this.updateVisual()
  }

  select(event) {
    event.preventDefault()
    const clickedDate = event.currentTarget.dataset.date
    if (!clickedDate) return

    if (event.metaKey || event.ctrlKey) {
      // Ctrl/Cmd + 클릭: 토글 (추가/제거)
      if (this.selectedDates.has(clickedDate)) {
        this.selectedDates.delete(clickedDate)
      } else {
        this.selectedDates.add(clickedDate)
      }
    } else if (event.shiftKey && this.lastClickedDate) {
      // Shift + 클릭: 범위 선택
      this.selectRange(this.lastClickedDate, clickedDate)
    } else {
      // 일반 클릭: 단일 선택
      this.selectedDates.clear()
      this.selectedDates.add(clickedDate)
    }

    this.lastClickedDate = clickedDate
    this.updateVisual()
    this.updateFabButton()
    this.fetchTransactions()
  }

  selectRange(from, to) {
    const start = new Date(from)
    const end = new Date(to)
    const min = start < end ? start : end
    const max = start < end ? end : start

    const current = new Date(min)
    while (current <= max) {
      this.selectedDates.add(current.toISOString().split("T")[0])
      current.setDate(current.getDate() + 1)
    }
  }

  updateVisual() {
    this.dayTargets.forEach(el => {
      if (this.selectedDates.has(el.dataset.date)) {
        el.classList.add("calendar-selected")
      } else {
        el.classList.remove("calendar-selected")
      }
    })
  }

  updateFabButton() {
    const btn = document.getElementById("new-transaction-btn")
    if (!btn) return
    // FAB 버튼의 날짜를 마지막 선택된 날짜로 설정
    const lastDate = this.lastClickedDate || [...this.selectedDates].pop()
    if (lastDate) {
      const btnUrl = new URL(btn.getAttribute("href"), window.location.origin)
      btnUrl.searchParams.set("date", lastDate)
      btn.setAttribute("href", btnUrl.pathname + btnUrl.search)
    }
  }

  fetchTransactions() {
    const dates = [...this.selectedDates].sort()
    if (dates.length === 0) return

    // URL 구성: dates[]=2026-03-01&dates[]=2026-03-02
    const params = new URLSearchParams()
    dates.forEach(d => params.append("dates[]", d))

    const url = `/dashboard/daily_transactions?${params.toString()}`

    // Turbo로 두 프레임 동시 업데이트
    fetch(url, {
      headers: {
        "Accept": "text/html",
        "Turbo-Frame": "daily_transactions"
      }
    })
    .then(response => response.text())
    .then(html => {
      // daily_transactions 프레임 업데이트
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")

      const txFrame = doc.querySelector("turbo-frame#daily_transactions")
      if (txFrame) {
        const target = document.querySelector("turbo-frame#daily_transactions")
        if (target) target.innerHTML = txFrame.innerHTML
      }

      const statsFrame = doc.querySelector("turbo-frame#selection_stats")
      if (statsFrame) {
        const statsTarget = document.querySelector("turbo-frame#selection_stats")
        if (statsTarget) statsTarget.innerHTML = statsFrame.innerHTML
      }

      // lucide 아이콘 재렌더링
      if (window.lucide) window.lucide.createIcons()
    })
  }
}
