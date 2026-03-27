import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  connect() {
    // 모달 열릴 때 ESC 키 리스너를 document에 등록 (포커스 무관하게 동작)
    this.boundKeydown = this.handleKeydown.bind(this)
    document.addEventListener("keydown", this.boundKeydown)

    // 모달 overlay에 포커스 (접근성)
    this.element.setAttribute("tabindex", "-1")
    this.element.focus({ preventScroll: true })
  }

  disconnect() {
    document.removeEventListener("keydown", this.boundKeydown)
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }

  close() {
    this.element.remove()
  }

  closeOnBackdrop(event) {
    if (this.hasContentTarget && !this.contentTarget.contains(event.target)) {
      this.close()
    }
  }
}
