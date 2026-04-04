import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["chip", "hiddenField"]

  toggle(event) {
    const chip = event.currentTarget
    const tagId = chip.dataset.tagId
    const color = chip.querySelector("span")?.style?.backgroundColor || "var(--color-accent)"
    const isSelected = chip.classList.contains("tag-chip-selected")

    const dot = chip.querySelector(".tag-chip-dot")

    if (isSelected) {
      // Deselect
      chip.classList.remove("tag-chip-selected")
      chip.style.backgroundColor = "transparent"
      chip.style.borderColor = ""
      chip.style.color = "var(--color-text-secondary)"
      if (dot) dot.style.backgroundColor = color
      this.removeHiddenField(tagId)
    } else {
      // Select
      chip.classList.add("tag-chip-selected")
      chip.style.backgroundColor = color
      chip.style.borderColor = color
      chip.style.color = "#fff"
      if (dot) dot.style.backgroundColor = "#fff"
      this.addHiddenField(tagId)
    }
  }

  addHiddenField(tagId) {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = "tag_ids[]"
    input.value = tagId
    input.dataset.tagSelectorTarget = "hiddenField"
    input.dataset.tagId = tagId
    this.element.appendChild(input)
  }

  removeHiddenField(tagId) {
    const input = this.element.querySelector(`input[data-tag-id="${tagId}"]`)
    if (input) input.remove()
  }
}
