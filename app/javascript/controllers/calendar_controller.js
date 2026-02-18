import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["day"]

  connect() {
    // 페이지 로드 시 오늘 날짜를 기본 선택
    const today = this.element.querySelector("[data-calendar-today]")
    if (today) {
      today.classList.add("calendar-selected")
    }
  }

  select(event) {
    // 기존 선택 해제
    this.dayTargets.forEach(el => el.classList.remove("calendar-selected"))

    // 새 선택 적용
    event.currentTarget.classList.add("calendar-selected")
  }
}
