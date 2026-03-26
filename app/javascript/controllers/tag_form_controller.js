import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["generalButton", "givingButton", "receivingButton"]

  connect() {
    this.selectType()
    // Re-render lucide icons in modal
    if (window.lucide) lucide.createIcons()
  }

  selectType() {
    const selected = this.element.querySelector('input[name="tag[tag_type]"]:checked')
    if (!selected) return

    const colors = {
      general: "var(--color-accent)",
      giving: "#f97316",
      receiving: "#3b82f6"
    }

    const buttons = {
      general: this.hasGeneralButtonTarget ? this.generalButtonTarget : null,
      giving: this.hasGivingButtonTarget ? this.givingButtonTarget : null,
      receiving: this.hasReceivingButtonTarget ? this.receivingButtonTarget : null
    }

    // Reset all
    Object.values(buttons).forEach(btn => {
      if (!btn) return
      btn.style.backgroundColor = "transparent"
      btn.style.color = "var(--color-text-primary)"
      btn.style.borderColor = "var(--color-border)"
    })

    // Highlight selected
    const btn = buttons[selected.value]
    if (btn) {
      btn.style.backgroundColor = colors[selected.value]
      btn.style.color = "#fff"
      btn.style.borderColor = colors[selected.value]
    }
  }
}
