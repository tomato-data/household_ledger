# Proxmox Terraform Variables

# ===================
# Proxmox Connection
# ===================

variable "proxmox_url" {
  description = "Proxmox API URL"
  type        = string
  default     = "https://192.168.100.2:8006"
}

variable "proxmox_user" {
  description = "Proxmox username"
  type        = string
  default     = "root@pam"
}

variable "proxmox_password" {
  description = "Proxmox password"
  type        = string
  sensitive  = true
}

variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
  default     = "calcifer"
}

# ===================
# LXC Configuration
# ===================

variable "lxc_vmid" {
  description = "LXC Container ID"
  type        = number
  default     = 201
}

variable "lxc_hostname" {
  description = "LXC Container hostname"
  type        = string
  default     = "ledger"
}

variable "lxc_template" {
  description = "LXC template path"
  type        = string
  default     = "local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
}

variable "lxc_storage" {
  description = "Storage for rootfs"
  type        = string
  default     = "local-lvm"
}

variable "lxc_bridge" {
  description = "Network bridge"
  type        = string
  default     = "vmbr0"
}

variable "lxc_ip" {
  description = "IP configuration (CIDR format)"
  type        = string
  default     = "192.168.100.20/24"
}

variable "lxc_gateway" {
  description = "Gateway IP"
  type        = string
  default     = "192.168.100.1"
}

variable "ssh_public_key" {
  description = "SSH public key for root access (Kamal uses this)"
  type        = string
}

# ===================
# Resource Allocation
# ===================

variable "lxc_memory" {
  description = "Memory in MB"
  type        = number
  default     = 1024
}

variable "lxc_swap" {
  description = "Swap in MB"
  type        = number
  default     = 512
}

variable "lxc_cores" {
  description = "Number of CPU cores"
  type        = number
  default     = 1
}

variable "lxc_disk_gb" {
  description = "Disk size in GB"
  type        = number
  default     = 8
}
