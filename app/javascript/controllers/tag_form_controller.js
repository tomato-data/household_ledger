import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Re-render lucide icons in modal
    if (window.lucide) lucide.createIcons()
  }
}
