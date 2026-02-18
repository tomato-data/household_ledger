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
