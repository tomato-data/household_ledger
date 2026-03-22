module ApplicationHelper
  def format_currency(amount)
    number_to_currency(amount, unit: "원", format: "%n%u", delimiter: ",", precision: 0)
  end

  def colored_amount(amount, type)
    css_color = type.to_s == "income" ? "var(--color-income)" : "var(--color-expense)"
    prefix = type.to_s == "income" ? "+" : "-"
    content_tag(:span, "#{prefix}#{format_currency(amount.abs)}", style: "color: #{css_color};")
  end

  def lucide_icon(name, size: 16, css_class: "", **options)
    content_tag(:i, nil,
      data: { lucide: name },
      class: "lucide-icon #{css_class}",
      style: "width: #{size}px; height: #{size}px; #{options[:style]}")
  end

  # 사이드바 네비게이션 링크
  def sidebar_link(label, path, icon_name)
    active = current_page?(path)
    css = active ? "sidebar-link sidebar-link-active" : "sidebar-link"
    link_to path, class: css, data: { action: "click->sidebar#close" } do
      lucide_icon(icon_name, size: 18) + content_tag(:span, label)
    end
  end

  # 모바일 하단 탭 네비게이션
  def bottom_nav_tab(label, path, icon_name)
    active = current_page?(path)
    color = active ? "var(--color-accent)" : "var(--color-text-muted)"
    link_to path, class: "flex flex-col items-center justify-center gap-0.5 flex-1 py-1",
                  style: "color: #{color};" do
      lucide_icon(icon_name, size: 20) +
        content_tag(:span, label, class: "text-[10px] font-medium")
    end
  end

  def type_badge(type)
    if type.to_s == "income"
      content_tag(:span, "수입", class: "badge badge-income")
    else
      content_tag(:span, "지출", class: "badge badge-expense")
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
