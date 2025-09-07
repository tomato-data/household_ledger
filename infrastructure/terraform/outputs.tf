output "k8s_master_ip" {
  description = "K8s Master 노드 IP 주소"
  value       = proxmox_vm_qemu.k8s-master.default_ipv4_address
}

output "k8s_worker1_ip" {
  description = "K8s Worker1 노드 IP 주소"
  value       = proxmox_vm_qemu.k8s-worker1.default_ipv4_address
}

output "k8s_worker2_ip" {
  description = "K8s Worker2 노드 IP 주소"
  value       = proxmox_vm_qemu.k8s-worker2.default_ipv4_address
}

output "k8s_worker3_ip" {
  description = "K8s Worker3 노드 IP 주소"
  value       = proxmox_vm_qemu.k8s-worker3.default_ipv4_address
}

output "all_node_ips" {
  description = "모든 노드 IP 주소"
  value = {
    master  = proxmox_vm_qemu.k8s-master.default_ipv4_address
    worker1 = proxmox_vm_qemu.k8s-worker1.default_ipv4_address
    worker2 = proxmox_vm_qemu.k8s-worker2.default_ipv4_address
    worker3 = proxmox_vm_qemu.k8s-worker3.default_ipv4_address
  }
}