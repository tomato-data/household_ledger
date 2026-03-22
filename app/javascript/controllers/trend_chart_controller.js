import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    labels: Array,
    data: Array,
    color: { type: String, default: "#6366f1" },
    highlight: { type: Number, default: -1 }
  }

  connect() {
    this.chart = null
    this.buildChart()
  }

  disconnect() {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }

  buildChart() {
    const ctx = this.canvasTarget.getContext("2d")
    const color = this.colorValue
    const highlightIdx = this.highlightValue

    // 그래디언트 fill
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.parentElement.offsetHeight || 160)
    gradient.addColorStop(0, this.hexToRgba(color, 0.3))
    gradient.addColorStop(1, this.hexToRgba(color, 0.02))

    // 포인트 색상: 마지막(현재 월)만 강조
    const pointBg = this.dataValue.map((_, i) =>
      i === highlightIdx ? color : this.hexToRgba(color, 0.5)
    )
    const pointRadius = this.dataValue.map((_, i) =>
      i === highlightIdx ? 5 : 3
    )

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.labelsValue,
        datasets: [{
          data: this.dataValue,
          borderColor: color,
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: pointBg,
          pointBorderColor: color,
          pointBorderWidth: 1.5,
          pointRadius: pointRadius,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: 10,
            cornerRadius: 8,
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toLocaleString()}원`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              color: this.tickColor()
            },
            border: { display: false }
          },
          y: {
            grid: {
              color: this.gridColor(),
              drawTicks: false
            },
            ticks: {
              font: { size: 10 },
              color: this.tickColor(),
              callback: (v) => {
                if (v >= 1000000) return (v / 1000000).toFixed(1) + "M"
                if (v >= 10000) return (v / 10000).toFixed(0) + "만"
                return v.toLocaleString()
              },
              maxTicksLimit: 5
            },
            border: { display: false },
            beginAtZero: true
          }
        },
        interaction: {
          intersect: false,
          mode: "index"
        }
      }
    })
  }

  hexToRgba(hex, alpha) {
    if (hex.startsWith("rgb")) return hex.replace(")", `, ${alpha})`).replace("rgb", "rgba")
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  tickColor() {
    return document.documentElement.classList.contains("dark") ? "#71717a" : "#a1a1aa"
  }

  gridColor() {
    return document.documentElement.classList.contains("dark") ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  }
}
