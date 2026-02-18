// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import "chartkick"
import "Chart.bundle"

// Lucide Icons 초기화
function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons()
  }
}

document.addEventListener("DOMContentLoaded", initLucideIcons)
document.addEventListener("turbo:load", initLucideIcons)
document.addEventListener("turbo:frame-load", initLucideIcons)
document.addEventListener("turbo:before-stream-render", (event) => {
  const originalRender = event.detail.render
  event.detail.render = function(streamElement) {
    originalRender(streamElement)
    initLucideIcons()
  }
})

// 커스텀 확인 모달 (browser alert 대체)
Turbo.setConfirmMethod((message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement("div")
    overlay.className = "fixed inset-0 z-[60] flex items-center justify-center p-4"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)"
    overlay.innerHTML = `
      <div class="w-full max-w-xs rounded-xl shadow-2xl p-5"
           style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);">
        <p class="text-sm mb-5" style="color: var(--color-text-primary);">${message}</p>
        <div class="flex gap-3">
          <button data-role="cancel"
                  class="flex-1 py-2 rounded-lg text-sm cursor-pointer"
                  style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);">
            취소
          </button>
          <button data-role="confirm"
                  class="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer"
                  style="background-color: var(--color-danger); color: #fff;">
            삭제
          </button>
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    const cleanup = (result) => {
      overlay.remove()
      resolve(result)
    }

    overlay.querySelector('[data-role="confirm"]').addEventListener("click", () => cleanup(true))
    overlay.querySelector('[data-role="cancel"]').addEventListener("click", () => cleanup(false))
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false)
    })
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handler)
        cleanup(false)
      }
    })
  })
})

// 공용 Toast 함수
window.showToast = function(message, type = "success") {
  const container = document.getElementById("toast-container")
  if (!container) return

  const toast = document.createElement("div")
  toast.className = "toast-item flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm transition-all duration-300"
  toast.style.cssText = `
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    color: ${type === "success" ? "var(--color-income)" : "var(--color-danger)"};
    opacity: 0; transform: translateY(10px);
  `

  const icon = type === "success" ? "check-circle" : "alert-circle"
  toast.innerHTML = `
    <i data-lucide="${icon}" style="width:16px;height:16px;flex-shrink:0;"></i>
    <span class="flex-1">${message}</span>
  `

  container.appendChild(toast)
  if (window.lucide) window.lucide.createIcons()

  // 등장 애니메이션
  requestAnimationFrame(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
  })

  // 3초 후 자동 제거
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(10px)"
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}
