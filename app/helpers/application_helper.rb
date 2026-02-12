module ApplicationHelper
  def format_currency(amount)
    number_to_currency(amount, unit: "원", format: "%n%u", delimiter: ",", precision: 0)
  end

  def colored_amount(amount, type)
    css_color = type.to_s == "income" ? "var(--color-income)" : "var(--color-expense)"
    prefix = type.to_s == "income" ? "+" : "-"
    content_tag(:span, "#{prefix}#{format_currency(amount.abs)}", style: "color: #{css_color};")
  end

  def type_badge(type)
    if type.to_s == "income"
      content_tag(:span, "수입",
        class: "px-2 py-0.5 rounded-full text-xs font-medium",
        style: "background-color: color-mix(in srgb, var(--color-income) 20%, transparent); color: var(--color-income);")
    else
      content_tag(:span, "지출",
        class: "px-2 py-0.5 rounded-full text-xs font-medium",
        style: "background-color: color-mix(in srgb, var(--color-expense) 20%, transparent); color: var(--color-expense);")
    end
  end

  def status_badge(status)
    config = {
      "confirmed" => { label: "확정", color: "var(--color-success)" },
      "scheduled" => { label: "예정", color: "var(--color-assets)" },
      "pending"   => { label: "대기", color: "var(--color-text-muted)" }
    }
    c = config[status.to_s] || config["pending"]
    content_tag(:span, c[:label],
      class: "px-2 py-0.5 rounded-full text-xs font-medium",
      style: "background-color: color-mix(in srgb, #{c[:color]} 20%, transparent); color: #{c[:color]};")
  end
end
