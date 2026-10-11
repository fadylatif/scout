import io
import pytest
import openpyxl
from django.urls import reverse
from rest_framework.test import APIClient

from apps.common.models import AuditLog, AuditAction
from apps.common.services.crypto import encrypt_bytes, decrypt_bytes
from apps.common.services.qr import generate_qr_png_bytes
from apps.common.services.excel import generate_sample_scout_excel
from apps.common.services.file_validator import detect_mime_type

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
def test_health_check_endpoint(api_client):
    """Smoke test: verify /api/health/ responds healthy."""
    url = reverse('health-check')
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'healthy'
    assert data['database'] == 'healthy'

@pytest.mark.django_db
def test_smoke_test_endpoint(api_client):
    """Smoke test: verify /api/smoke-test/ runs all diagnostics and all pass."""
    url = reverse('smoke-test')
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data['smoke_test_passed'] is True
    assert data['components']['database']['status'] == 'PASS'
    assert data['components']['crypto']['status'] == 'PASS'
    assert data['components']['qr_code']['status'] == 'PASS'
    assert data['components']['excel_export']['status'] == 'PASS'
    assert data['components']['file_magic_mime']['status'] == 'PASS'

@pytest.mark.django_db
def test_audit_log_creation():
    """Smoke test: verify AuditLog model stores actions, JSON diffs, and timestamps."""
    log = AuditLog.objects.create(
        action=AuditAction.CREATE,
        entity_type="Member",
        entity_id="MEM-TEST-001",
        description="تم إضافة فرد جديد بنجاح",
        old_values={},
        new_values={"name": "فادي نبيل", "stage": "مرحلة الكشاف"},
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0 Test"
    )
    assert AuditLog.objects.count() == 1
    assert log.action == AuditAction.CREATE
    assert log.new_values["name"] == "فادي نبيل"
    assert str(log).startswith("إضافة - Member")

def test_crypto_encryption_and_decryption():
    """Smoke test: verify Fernet encryption and exact decryption match."""
    original_text = "بيانات كشفية سرية للنسخ الاحتياطي 2026 - مجموعة أبي سيفين"
    token = encrypt_bytes(original_text.encode('utf-8'))
    assert token != original_text.encode('utf-8')

    decrypted = decrypt_bytes(token).decode('utf-8')
    assert decrypted == original_text

def test_qr_code_generation():
    """Smoke test: verify QR code generator produces valid PNG bytes."""
    qr_data = "SCOUT-MEMBER-UUID-PERMANENT-2026"
    png_bytes = generate_qr_png_bytes(qr_data)
    assert len(png_bytes) > 200
    mime = detect_mime_type(png_bytes)
    assert mime == "image/png"

def test_excel_arabic_generation():
    """Smoke test: verify Excel export generates valid workbook with RTL flag and Arabic headers."""
    excel_bytes = generate_sample_scout_excel()
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    ws = wb.active
    assert ws.title == "كشف الأفراد"
    assert ws.sheet_view.rightToLeft is True
    assert ws.cell(row=1, column=1).value == "المعرف الدائم"
    assert ws.cell(row=1, column=3).value == "الاسم الرباعي"
    assert ws.max_row >= 4
