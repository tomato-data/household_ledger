import { Controller } from "@hotwired/stimulus"

const PRESET_COLORS = [
  { name: "gray",   value: "#a3a3a3" },
  { name: "brown",  value: "#a8856c" },
  { name: "orange", value: "#f97316" },
  { name: "yellow", value: "#eab308" },
  { name: "green",  value: "#22c55e" },
  { name: "cyan",   value: "#06b6d4" },
  { name: "blue",   value: "#3b82f6" },
  { name: "purple", value: "#8b5cf6" },
  { name: "pink",   value: "#ec4899" },
  { name: "red",    value: "#ef4444" }
]

export default class extends Controller {
  static targets = ["input", "colorInput", "preview", "dropdown", "grid", "search", "colorDots"]

  connect() {
    this.isOpen = false
    this.iconsLoaded = false
    this.selectedColor = (this.hasColorInputTarget && this.colorInputTarget.value) || "#a3a3a3"

    this.outsideClickHandler = (event) => {
      if (this.isOpen && !this.element.contains(event.target)) {
        this.close()
      }
    }
    document.addEventListener("click", this.outsideClickHandler)
  }

  disconnect() {
    document.removeEventListener("click", this.outsideClickHandler)
  }

  toggle() {
    this.isOpen ? this.close() : this.open()
  }

  open() {
    if (!this.iconsLoaded) {
      this.loadIcons()
    }
    this.dropdownTarget.classList.remove("hidden")
    this.isOpen = true
    if (this.hasSearchTarget) this.searchTarget.focus()
  }

  close() {
    this.dropdownTarget.classList.add("hidden")
    this.isOpen = false
    if (this.hasSearchTarget) {
      this.searchTarget.value = ""
      this.filter()
    }
  }

  toKebabCase(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase()
  }

  getIconNames() {
    if (!window.lucide) return []
    const source = window.lucide.icons || window.lucide
    return Object.keys(source)
      .filter(key => {
        if (typeof source[key] === "function") return false
        if (["default", "icons", "createIcons", "createElement"].includes(key)) return false
        return key[0] === key[0].toUpperCase()
      })
      .map(key => this.toKebabCase(key))
      .sort()
  }

  loadIcons() {
    const icons = this.getIconNames()
    if (icons.length === 0) return

    const fragment = document.createDocumentFragment()
    icons.forEach(name => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.dataset.action = "icon-picker#selectIcon"
      btn.dataset.icon = name
      btn.dataset.iconPickerName = name
      btn.className = "icon-picker-item p-1.5 rounded hover:opacity-80 flex items-center justify-center"
      btn.style.cssText = `color: ${this.selectedColor};`
      btn.title = name
      btn.innerHTML = `<i data-lucide="${name}" style="width: 16px; height: 16px;"></i>`
      fragment.appendChild(btn)
    })

    this.gridTarget.appendChild(fragment)
    requestAnimationFrame(() => {
      if (window.lucide) window.lucide.createIcons()
    })
    this.iconsLoaded = true
  }

  selectIcon(event) {
    const iconName = event.currentTarget.dataset.icon
    this.inputTarget.value = iconName
    this.updatePreview(iconName, this.selectedColor)
    this.close()
  }

  selectColor(event) {
    const color = event.currentTarget.dataset.color
    this.selectedColor = color
    if (this.hasColorInputTarget) this.colorInputTarget.value = color

    // 컬러 도트 선택 표시 업데이트
    this.colorDotsTarget.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("ring-2", btn.dataset.color === color)
    })

    // 그리드 아이콘 색상 업데이트
    this.gridTarget.querySelectorAll(".icon-picker-item").forEach(item => {
      item.style.color = color
    })

    // 프리뷰 업데이트
    const currentIcon = this.inputTarget.value || "file-text"
    this.updatePreview(currentIcon, color)
  }

  updatePreview(iconName, color) {
    this.previewTarget.innerHTML = `<i data-lucide="${iconName}" style="width: 20px; height: 20px;"></i>`
    this.previewTarget.style.color = color
    requestAnimationFrame(() => {
      if (window.lucide) window.lucide.createIcons()
    })
  }

  filter() {
    const query = this.searchTarget.value.toLowerCase().trim()
    const items = this.gridTarget.querySelectorAll("[data-icon-picker-name]")
    items.forEach(item => {
      const name = item.dataset.iconPickerName
      item.style.display = (!query || name.includes(query)) ? "" : "none"
    })
  }
}

export { PRESET_COLORS }
