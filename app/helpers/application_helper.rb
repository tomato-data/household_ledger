module ApplicationHelper
  CHART_PALETTE = %w[
    #6366f1 #0ea5e9 #14b8a6 #f59e0b #8b5cf6
    #64748b #ec4899 #d97706 #0891b2 #7c3aed
    #059669 #dc2626 #2563eb #ca8a04 #9333ea
  ].freeze

  def format_currency(amount)
    number_to_currency(amount, unit: "원", format: "%n%u", delimiter: ",", precision: 0)
  end

  # DB 색상이 기본값이면 팔레트 색상, 커스텀이면 그대로 사용
  def chart_color(db_color, index)
    db_color.present? && db_color != "#a3a3a3" ? db_color : CHART_PALETTE[index % CHART_PALETTE.length]
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
  def sidebar_link(label, path, icon_name, also_active_for: [])
    active = current_page?(path) || also_active_for.any? { |p| current_page?(p) }
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
