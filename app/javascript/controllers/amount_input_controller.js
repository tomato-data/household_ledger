import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["display", "value"]

  format() {
    const raw = this.displayTarget.value.replace(/[^\d]/g, "")
    const number = parseInt(raw, 10)

    if (isNaN(number)) {
      this.displayTarget.value = ""
      this.valueTarget.value = ""
      return
    }

    this.displayTarget.value = number.toLocaleString("ko-KR")
    this.valueTarget.value = number
  }

  // 폼 제출 전에 hidden input에 정수값이 들어있는지 확인
  submit() {
    const raw = this.displayTarget.value.replace(/[^\d]/g, "")
    this.valueTarget.value = raw || "0"
  }
}
