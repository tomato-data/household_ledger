# Proxmox 연결 정보
variable "proxmox_api_url" {
  description = "Proxmox API URL (예: https://192.168.100.x:8006/api2/json)"
  type        = string
}

variable "proxmox_api_token_id" {
  description = "Proxmox API 토큰 ID (예: root@pam!terraform)"
  type        = string
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API 토큰 시크릿"
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox 노드 이름"
  type        = string
}

# VM 설정
variable "ssh_public_key" {
  description = "SSH 공개 키"
  type        = string
  default     = ""
}

variable "vm_template" {
  description = "VM 템플릿 이름 (Ubuntu 22.04 cloud-init)"
  type        = string
  default     = "ubuntu-22.04-template"
}