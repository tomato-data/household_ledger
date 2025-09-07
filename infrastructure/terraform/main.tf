# Kubernetes Master 노드
resource "proxmox_vm_qemu" "k8s-master" {
  name        = "k8s-master"
  vmid        = 100
  target_node = var.proxmox_node
  
  # 하드웨어 설정
  cores   = 2
  sockets = 1
  memory  = 2048
  
  # 디스크 설정
  disk {
    size    = "80G"
    storage = "local-lvm"
    type    = "scsi"
    format  = "raw"
  }
  
  # 네트워크 설정
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
  
  # OS 설정
  os_type    = "cloud-init"
  clone      = var.vm_template
  full_clone = true
  
  # Cloud-init 설정
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = var.ssh_public_key
  
  # 자동 시작
  onboot = true
  
  # 추가 설정
  agent    = 1
  bootdisk = "scsi0"
}

# Kubernetes Worker 노드 1
resource "proxmox_vm_qemu" "k8s-worker1" {
  name        = "k8s-worker1"
  vmid        = 101
  target_node = var.proxmox_node
  
  cores   = 2
  sockets = 1
  memory  = 4096
  
  disk {
    size    = "150G"
    storage = "local-lvm"
    type    = "scsi"
    format  = "raw"
  }
  
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
  
  os_type    = "cloud-init"
  clone      = var.vm_template
  full_clone = true
  
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = var.ssh_public_key
  
  onboot   = true
  agent    = 1
  bootdisk = "scsi0"
}

# Kubernetes Worker 노드 2
resource "proxmox_vm_qemu" "k8s-worker2" {
  name        = "k8s-worker2"
  vmid        = 102
  target_node = var.proxmox_node
  
  cores   = 2
  sockets = 1
  memory  = 4096
  
  disk {
    size    = "150G"
    storage = "local-lvm"
    type    = "scsi"
    format  = "raw"
  }
  
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
  
  os_type    = "cloud-init"
  clone      = var.vm_template
  full_clone = true
  
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = var.ssh_public_key
  
  onboot   = true
  agent    = 1
  bootdisk = "scsi0"
}

# Kubernetes Worker 노드 3
resource "proxmox_vm_qemu" "k8s-worker3" {
  name        = "k8s-worker3"
  vmid        = 103
  target_node = var.proxmox_node
  
  cores   = 2
  sockets = 1
  memory  = 4096
  
  disk {
    size    = "130G"
    storage = "local-lvm"
    type    = "scsi"
    format  = "raw"
  }
  
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
  
  os_type    = "cloud-init"
  clone      = var.vm_template
  full_clone = true
  
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = var.ssh_public_key
  
  onboot   = true
  agent    = 1
  bootdisk = "scsi0"
}