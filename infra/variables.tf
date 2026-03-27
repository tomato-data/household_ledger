# Proxmox Terraform Variables

# ===================
# Proxmox Connection
# ===================

variable "proxmox_url" {
  description = "Proxmox API URL (e.g. https://host:8006)"
  type        = string
}

variable "proxmox_user" {
  description = "Proxmox username (e.g. REDACTED_USER)"
  type        = string
}

variable "proxmox_password" {
  description = "Proxmox password"
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
}

# ===================
# LXC Configuration
# ===================

variable "lxc_vmid" {
  description = "LXC Container ID"
  type        = number
}

variable "lxc_hostname" {
  description = "LXC Container hostname"
  type        = string
}

variable "lxc_template" {
  description = "LXC template path (e.g. local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst)"
  type        = string
}

variable "lxc_storage" {
  description = "Storage for rootfs (e.g. local-lvm)"
  type        = string
}

variable "lxc_bridge" {
  description = "Network bridge (e.g. vmbr0)"
  type        = string
}

variable "lxc_ip" {
  description = "IP configuration in CIDR format (e.g. 192.168.1.100/24)"
  type        = string
}

variable "lxc_gateway" {
  description = "Gateway IP (e.g. 192.168.1.1)"
  type        = string
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
