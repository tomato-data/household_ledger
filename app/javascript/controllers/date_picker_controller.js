import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // HTML5 date input의 기본 동작을 사용하되,
  // 한국어 포맷이 필요한 경우 커스터마이징
  connect() {
    // date input은 브라우저 locale을 따르므로 추가 처리 불필요한 경우가 대부분
  }
}
