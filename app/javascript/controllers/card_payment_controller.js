import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggle", "details"]

  toggle() {
    if (this.toggleTarget.checked) {
      this.detailsTarget.classList.remove("hidden")
    } else {
      this.detailsTarget.classList.add("hidden")
    }
  }
}
