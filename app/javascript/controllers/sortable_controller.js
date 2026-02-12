import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = ["list"]
  static values = { url: String }

  connect() {
    this.sortable = Sortable.create(this.listTarget, {
      handle: ".cursor-grab",
      animation: 150,
      ghostClass: "opacity-50",
      onEnd: this.onEnd.bind(this)
    })
  }

  disconnect() {
    if (this.sortable) this.sortable.destroy()
  }

  onEnd() {
    const items = this.listTarget.querySelectorAll("[data-category-id]")
    const positions = Array.from(items).map((item, index) => ({
      id: parseInt(item.dataset.categoryId),
      position: index + 1
    }))

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch(this.urlValue, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        "Accept": "text/vnd.turbo-stream.html"
      },
      body: JSON.stringify({ positions })
    })
  }
}
