import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { path: String }

  // Turbo Frame 링크가 대부분의 필터링을 처리하므로
  // 추가 클라이언트 로직이 필요할 때 확장
}
