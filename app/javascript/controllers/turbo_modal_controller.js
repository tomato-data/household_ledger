import { Controller } from "@hotwired/stimulus"

// Turbo Frame 안에 콘텐츠가 로드되면 자동으로 모달을 표시하는 컨트롤러
// turbo-frame#modal에서 사용
export default class extends Controller {
  connect() {
    // Turbo Stream 응답으로 modal frame이 비워지면 자동으로 disconnect됨
  }

  disconnect() {
    // cleanup if needed
  }
}
