import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["amount"]
  static values = { visible: { type: Boolean, default: true } }

  toggle() {
    this.visibleValue = !this.visibleValue
    this.amountTargets.forEach(target => {
      target.style.filter = this.visibleValue ? "none" : "blur(8px)"
    })
  }
}
