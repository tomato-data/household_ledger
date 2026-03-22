import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["subcategories", "parentTile"]

  select() {
    // peer-checked CSS가 자동 처리
  }

  // 하위 없는 카테고리 직접 선택: 다른 상위의 ring 해제 + 하위 패널 닫기
  selectDirect(event) {
    const selectedId = event.currentTarget.dataset.categoryId

    // 모든 _parent_selector radio 해제
    this.element.querySelectorAll('input[name="_parent_selector"]').forEach(r => {
      r.checked = false
    })

    // 모든 하위 패널 닫기
    this.subcategoriesTargets.forEach(panel => {
      panel.classList.add("hidden")
    })
  }

  // 하위 있는 카테고리 클릭: 하위 패널 토글 + 다른 상위 ring 해제
  expandParent(event) {
    const parentId = event.currentTarget.dataset.categoryId

    // 직접 선택된 category_id radio 해제 (하위 없는 카테고리)
    this.element.querySelectorAll('input[name="transaction[category_id]"]').forEach(r => {
      // 이 부모 또는 그 하위가 아닌 것들만 해제
      const tile = r.closest('[data-parent-id]')
      if (tile && tile.dataset.parentId !== parentId) {
        // 다른 부모 그룹의 직접 선택은 건드리지 않음
      }
    })

    // 하위 패널 토글
    this.subcategoriesTargets.forEach(panel => {
      if (panel.dataset.parentId === parentId) {
        panel.classList.toggle("hidden")
      } else {
        panel.classList.add("hidden")
        // 다른 부모의 _parent_selector 해제
        const otherRadio = this.element.querySelector(
          `input[name="_parent_selector"][data-category-id="${panel.dataset.parentId}"]`
        )
        if (otherRadio) otherRadio.checked = false
      }
    })
  }
}
