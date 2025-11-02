from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from io import BytesIO

from app.core.database import get_db
from app.models.user import User as UserModel
from app.schemas.backup import BackupMetadata
from app.services.backup_service import BackupService
from app.api.dependencies.auth import get_current_user

router = APIRouter(
    prefix="/backup",
    tags=["backup"],
)


@router.post("/export")
def export_backup(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """백업 파일 다운로드"""
    service = BackupService(db)
    backup_data = service.create_backup(current_user.id)
    return StreamingResponse(
        BytesIO(backup_data),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f"attachment; filename=hhl_backup_{datetime.now().strftime('%Y-%m-%d')}.json.gz"
        },
    )


@router.post("/import", response_model=BackupMetadata)
def import_backup(
    file: UploadFile = File(...),
    overwrite: bool = False,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """백업 파일 복원"""
    file_content = file.file.read()
    service = BackupService(db)
    backup_metadata = service.restore_backup(
        current_user.id, file_content, overwrite
    )
    if not backup_metadata:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup file or restore failed",
        )
    return backup_metadata


@router.post("/preview", response_model=BackupMetadata)
def preview_backup(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """백업 파일 미리보기"""
    file_content = file.file.read()
    service = BackupService(db)
    backup_metadata = service.get_backup_metadata(file_content)
    if not backup_metadata:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup file",
        )
    return backup_metadata
