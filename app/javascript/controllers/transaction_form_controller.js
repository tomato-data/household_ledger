import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["incomeButton", "expenseButton", "typeRadio"]

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

  connect() {
    this.selectType()
  }
}
