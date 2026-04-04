import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggle", "details"]

  toggle() {
    const isCard = this.toggleTarget.checked
    const statusSection = document.querySelector(
      '[data-transaction-form-target="statusSection"]'
    )

    if (isCard) {
      this.detailsTarget.classList.remove("hidden")
      if (statusSection) {
        statusSection.style.opacity = "0.4"
        statusSection.style.pointerEvents = "none"
      }
    } else {
      this.detailsTarget.classList.add("hidden")
      if (statusSection) {
        statusSection.style.opacity = ""
        statusSection.style.pointerEvents = ""
      }
    }
  }
}
