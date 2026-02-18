import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["incomeButton", "expenseButton", "confirmedButton", "scheduledButton", "typeRadio"]

  selectType() {
    const selected = this.element.querySelector('input[name="transaction[transaction_type]"]:checked')
    if (!selected) return

    const incomeDiv = this.incomeButtonTarget
    const expenseDiv = this.expenseButtonTarget

    if (selected.value === "income") {
      incomeDiv.style.backgroundColor = "var(--color-income)"
      incomeDiv.style.color = "#000"
      expenseDiv.style.backgroundColor = "transparent"
      expenseDiv.style.color = "var(--color-text-primary)"
    } else {
      expenseDiv.style.backgroundColor = "var(--color-expense)"
      expenseDiv.style.color = "#000"
      incomeDiv.style.backgroundColor = "transparent"
      incomeDiv.style.color = "var(--color-text-primary)"
    }
  }

  selectStatus() {
    const selected = this.element.querySelector('input[name="transaction[status]"]:checked')
    if (!selected) return

    const confirmedDiv = this.confirmedButtonTarget
    const scheduledDiv = this.scheduledButtonTarget

    if (selected.value === "confirmed") {
      confirmedDiv.style.backgroundColor = "var(--color-accent)"
      confirmedDiv.style.color = "var(--color-text-primary)"
      scheduledDiv.style.backgroundColor = "transparent"
      scheduledDiv.style.color = "var(--color-text-secondary)"
    } else {
      scheduledDiv.style.backgroundColor = "var(--color-accent)"
      scheduledDiv.style.color = "var(--color-text-primary)"
      confirmedDiv.style.backgroundColor = "transparent"
      confirmedDiv.style.color = "var(--color-text-secondary)"
    }
  }

  connect() {
    this.selectType()
    this.selectStatus()
  }
}
