import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["display", "editor", "actions"]

  edit() {
    this.displayTarget.classList.add("hidden")
    this.actionsTarget.classList.add("hidden")
    this.editorTarget.classList.remove("hidden")
    this.editorTarget.querySelector("input[type='text']")?.focus()
  }

  cancel() {
    this.editorTarget.classList.add("hidden")
    this.displayTarget.classList.remove("hidden")
    this.actionsTarget.classList.remove("hidden")
  }
}
