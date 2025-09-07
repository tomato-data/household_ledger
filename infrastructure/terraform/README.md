# Proxmox Terraform 설정

이 디렉토리는 Proxmox VE에서 Kubernetes 클러스터를 위한 VM들을 자동으로 생성합니다.

## 사전 요구사항

1. **Proxmox에서 Ubuntu 22.04 Cloud-Init 템플릿 생성**
2. **Terraform 설치** (`brew install terraform`)
3. **SSH 키 페어 생성** (선택사항)

## 설정 방법

1. **설정 파일 복사**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **terraform.tfvars 파일 수정**:
   - `proxmox_api_url`: Proxmox 웹 UI 주소
   - `proxmox_password`: root 계정 비밀번호
   - `proxmox_node`: 노드 이름 (pvesh get /nodes로 확인)

3. **Terraform 초기화 및 실행**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## 생성되는 VM들

| VM 이름       | VMID | CPU | RAM | 디스크 | 역할           |
|--------------|------|-----|-----|-------|---------------|
| k8s-master   | 100  | 2   | 2GB | 80GB  | Control Plane |
| k8s-worker1  | 101  | 2   | 4GB | 150GB | Worker Node   |
| k8s-worker2  | 102  | 2   | 4GB | 150GB | Worker Node   |
| k8s-worker3  | 103  | 2   | 4GB | 130GB | Worker Node   |

## 다음 단계

VM 생성 후 각 노드에서 Kubernetes 설치를 진행합니다.