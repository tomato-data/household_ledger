terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.78"
    }
  }
}

provider "proxmox" {
  endpoint = var.proxmox_url
  username = var.proxmox_user
  password = var.proxmox_password
  insecure = true
}

resource "proxmox_virtual_environment_container" "ledger" {
  node_name   = var.proxmox_node
  vm_id       = var.lxc_vmid
  description = "Household Ledger (Rails 8 + Kamal)"

  unprivileged = false
  started      = true

  operating_system {
    template_file_id = var.lxc_template
    type             = "ubuntu"
  }

  initialization {
    hostname = var.lxc_hostname

    ip_config {
      ipv4 {
        address = var.lxc_ip
        gateway = var.lxc_gateway
      }
    }

    user_account {
      keys = [var.ssh_public_key]
    }
  }

  cpu {
    cores = var.lxc_cores
  }

  memory {
    dedicated = var.lxc_memory
    swap      = var.lxc_swap
  }

  disk {
    datastore_id = var.lxc_storage
    size         = var.lxc_disk_gb
  }

  network_interface {
    name   = "eth0"
    bridge = var.lxc_bridge
  }

  features {
    nesting = true
  }

  startup {
    order = 1
  }
}