import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  close() {
    this.element.remove()
  }

  closeOnBackdrop(event) {
    if (this.hasContentTarget && !this.contentTarget.contains(event.target)) {
      this.close()
    }
  }
}
