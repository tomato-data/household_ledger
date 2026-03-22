import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["icon"]

  connect() {
    this.applyTheme(this.currentTheme)
  }

  toggle() {
    const next = this.currentTheme === "dark" ? "light" : "dark"
    localStorage.setItem("theme", next)
    this.applyTheme(next)
  }

  applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    this.updateThemeColor(theme)
    this.updateIcon(theme)
  }

  updateThemeColor(theme) {
    const meta = document.getElementById("theme-color")
    if (meta) {
      meta.content = theme === "dark" ? "#09090b" : "#f4f4f5"
    }
  }

  updateIcon(theme) {
    if (!this.hasIconTarget) return
    this.iconTarget.setAttribute("data-lucide", theme === "dark" ? "sun" : "moon")
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }

  get currentTheme() {
    const stored = localStorage.getItem("theme")
    if (stored) return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
}
