import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { message: String }

  confirm(event) {
    if (!window.confirm(this.messageValue || "정말 삭제하시겠습니까?")) {
      event.preventDefault()
    }
  }
}
