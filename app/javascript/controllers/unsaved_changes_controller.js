import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { dirty: { type: Boolean, default: false } }

  connect() {
    this.boundBeforeUnload = this.beforeUnload.bind(this)
  }

  markDirty() {
    this.dirtyValue = true
    window.addEventListener("beforeunload", this.boundBeforeUnload)
  }

  markClean() {
    this.dirtyValue = false
    window.removeEventListener("beforeunload", this.boundBeforeUnload)
  }

  beforeUnload(event) {
    if (this.dirtyValue) {
      event.preventDefault()
      event.returnValue = ""
    }
  }

  disconnect() {
    window.removeEventListener("beforeunload", this.boundBeforeUnload)
  }
}
