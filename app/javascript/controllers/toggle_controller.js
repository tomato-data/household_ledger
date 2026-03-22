import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]
  static values = { mode: { type: String, default: "display" } }

  toggle() {
    this.contentTargets.forEach(target => {
      if (this.modeValue === "visibility") {
        // 공간 유지하면서 숨김 (총자산 카드 등)
        target.style.visibility = target.style.visibility === "hidden" ? "" : "hidden"
      } else {
        // 완전히 숨김/표시 (기본)
        target.style.display = target.style.display === "none" ? "" : "none"
      }
    })
  }
}
