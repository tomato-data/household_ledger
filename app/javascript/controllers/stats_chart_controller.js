import { Controller } from "@hotwired/stimulus"

// 모던 뮤트 팔레트 — 채도를 낮추고 톤을 통일
const PALETTE = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#64748b", // slate
  "#ec4899", // pink (뮤트)
  "#d97706", // amber-dark
  "#0891b2", // cyan
  "#7c3aed", // purple
  "#059669", // emerald
  "#dc2626", // red (절제)
  "#2563eb", // blue
  "#ca8a04", // yellow-dark
  "#9333ea", // purple-bright
]

export default class extends Controller {
  static targets = ["canvas", "toggleBtn", "toggleLabel"]
  static values = { stats: Array }

  connect() {
    this.expanded = false
    this.chart = null
    this.buildChart()
  }

  disconnect() {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }

  toggle() {
    this.expanded = !this.expanded
    this.toggleLabelTarget.textContent = this.expanded ? "간단히" : "상세"
    this.updateChart()
  }

  buildChart() {
    const ctx = this.canvasTarget.getContext("2d")
    const { datasets, options } = this.chartConfig(false)

    this.chart = new Chart(ctx, {
      type: "doughnut",
      data: { datasets },
      options
    })
  }

  updateChart() {
    if (!this.chart) return
    const { datasets } = this.chartConfig(this.expanded)
    this.chart.data.datasets = datasets
    this.chart.options.cutout = this.expanded ? "40%" : "60%"
    this.chart.update("active")
  }

  chartConfig(expanded) {
    const stats = this.statsValue

    const innerLabels = stats.map(s => s.name)
    const innerData = stats.map(s => s.amount)
    const innerColors = stats.map((s, i) => this.resolveColor(s.color, i))

    const innerDataset = {
      label: "카테고리",
      labels: innerLabels,
      data: innerData,
      backgroundColor: innerColors,
      borderWidth: 2,
      borderColor: this.borderColor(),
      hoverOffset: 4
    }

    if (!expanded) {
      return {
        datasets: [innerDataset],
        options: this.chartOptions("60%")
      }
    }

    // 외부 링: 서브카테고리
    const outerData = []
    const outerColors = []
    const outerLabels = []

    stats.forEach((parent, i) => {
      const baseColor = this.resolveColor(parent.color, i)
      const subs = parent.subcategories || []

      if (subs.length > 0) {
        subs.forEach((sub, j) => {
          outerData.push(sub.amount)
          outerLabels.push(sub.name)

          if (this.isCustomColor(sub.color)) {
            outerColors.push(sub.color)
          } else {
            // 부모 색상 기반: 채도 유지, 명도만 단계적으로 변화 (밝은 → 약간 어두운)
            const step = subs.length > 1 ? j / (subs.length - 1) : 0.5
            const lightness = 0.65 - step * 0.2 // 0.65 → 0.45 범위
            outerColors.push(this.toHSLVariant(baseColor, lightness))
          }
        })
      } else {
        outerData.push(parent.amount)
        outerLabels.push(parent.name)
        outerColors.push(this.toHSLVariant(baseColor, 0.55))
      }
    })

    const outerDataset = {
      label: "상세",
      labels: outerLabels,
      data: outerData,
      backgroundColor: outerColors,
      borderWidth: 2,
      borderColor: this.borderColor(),
      hoverOffset: 4,
      weight: 0.7
    }

    return {
      datasets: [outerDataset, innerDataset],
      options: this.chartOptions("40%")
    }
  }

  chartOptions(cutout) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      cutout: cutout,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed
              const labels = ctx.dataset.labels || []
              const name = labels[ctx.dataIndex] || ""
              return ` ${name}: ${value.toLocaleString()}원`
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 500
      }
    }
  }

  isCustomColor(color) {
    return color && color !== "#a3a3a3" && color !== "#A3A3A3"
  }

  resolveColor(color, index) {
    return this.isCustomColor(color) ? color : PALETTE[index % PALETTE.length]
  }

  // hex → HSL 변환 후, 지정 명도로 색상 생성 (채도는 원본 유지)
  toHSLVariant(hex, targetL) {
    // hex가 rgb() 형식일 수 있으므로 처리
    let r, g, b
    if (hex.startsWith("#")) {
      r = parseInt(hex.slice(1, 3), 16) / 255
      g = parseInt(hex.slice(3, 5), 16) / 255
      b = parseInt(hex.slice(5, 7), 16) / 255
    } else if (hex.startsWith("rgb")) {
      const m = hex.match(/(\d+)/g)
      r = parseInt(m[0]) / 255
      g = parseInt(m[1]) / 255
      b = parseInt(m[2]) / 255
    } else {
      return hex
    }

    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const d = max - min
    let h = 0, s = 0, l = (max + min) / 2

    if (d > 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
    }

    // 원본 색조(h) + 원본 채도(s) + 새 명도(targetL)
    const hDeg = Math.round(h * 360)
    const sPct = Math.round(Math.min(s, 0.75) * 100) // 채도 상한 75%로 뮤트
    const lPct = Math.round(targetL * 100)

    return `hsl(${hDeg}, ${sPct}%, ${lPct}%)`
  }

  borderColor() {
    return document.documentElement.classList.contains("dark")
      ? "#18181b"
      : "#ffffff"
  }
}
