import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  toggle() {
    this.contentTargets.forEach(target => {
      if (target.style.display === "none") {
        target.style.display = ""
      } else {
        target.style.display = "none"
      }
    })
  }
}
