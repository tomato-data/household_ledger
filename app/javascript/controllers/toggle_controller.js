import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  toggle() {
    this.contentTargets.forEach(target => {
      // visibility로 토글: 공간은 유지하면서 내용만 숨김
      if (target.style.visibility === "hidden") {
        target.style.visibility = ""
      } else {
        target.style.visibility = "hidden"
      }
    })
  }
}
