import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["subcategories"]

  select() {
    // peer-checked CSS가 자동 처리
  }

  expandParent(event) {
    const parentId = event.currentTarget.dataset.categoryId

    // 모든 하위 카테고리 패널 숨기기
    this.subcategoriesTargets.forEach(panel => {
      if (panel.dataset.parentId === parentId) {
        panel.classList.toggle("hidden")
      } else {
        panel.classList.add("hidden")
      }
    })
  }
}
