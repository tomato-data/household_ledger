output "lxc_id" {
  description = "LXC Container VMID"
  value       = proxmox_virtual_environment_container.ledger.vm_id
}

output "lxc_ip" {
  description = "LXC IP address"
  value       = var.lxc_ip
}