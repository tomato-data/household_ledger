import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // 캘린더 날짜 셀에 대한 인터랙션 처리
  // 현재는 Turbo Frame이 대부분의 네비게이션을 처리하므로
  // 추가적인 클라이언트 사이드 로직이 필요할 때 확장

  connect() {
    this.highlightToday()
  }

  highlightToday() {
    // 오늘 날짜 셀에 추가 스타일링이 필요할 경우
  }
}
