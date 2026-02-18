import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["day"]
  static values = { selectedDate: String }

  connect() {
    const dateToSelect = this.selectedDateValue || new Date().toISOString().split("T")[0]
    const target = this.dayTargets.find(el => el.dataset.date === dateToSelect)
    if (target) {
      target.classList.add("calendar-selected")
    }
  }

  select(event) {
    // 기존 선택 해제
    this.dayTargets.forEach(el => el.classList.remove("calendar-selected"))

    // 새 선택 적용
    event.currentTarget.classList.add("calendar-selected")

    // + 버튼의 href를 선택된 날짜로 업데이트
    const selectedDate = event.currentTarget.dataset.date
    if (selectedDate) {
      const btn = document.getElementById("new-transaction-btn")
      if (btn) {
        const btnUrl = new URL(btn.getAttribute("href"), window.location.origin)
        btnUrl.searchParams.set("date", selectedDate)
        btn.setAttribute("href", btnUrl.pathname + btnUrl.search)
      }
    }
  }
}
