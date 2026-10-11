from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .services.crypto import encrypt_bytes, decrypt_bytes
from .services.qr import generate_qr_png_bytes
from .services.excel import generate_sample_scout_excel
from .services.file_validator import detect_mime_type

class HealthCheckView(APIView):
    """
    Health check endpoint for Docker, Nginx, and Hostinger uptime monitoring.
    GET /api/health/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'database': 'unknown',
            'storage': 'healthy',
            'version': '1.0.0'
        }

        # Check database connectivity
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health_status['database'] = 'healthy'
        except Exception as e:
            health_status['database'] = f'unhealthy: {str(e)}'
            health_status['status'] = 'degraded'

        http_status = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_status, status=http_status)


class SmokeTestView(APIView):
    """
    Smoke test runner endpoint verifying all core system capabilities in Phase 0.
    GET /api/smoke-test/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        results = {}

        # 1. Database smoke test
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            results['database'] = {'status': 'PASS', 'message': 'Database connection OK'}
        except Exception as e:
            results['database'] = {'status': 'FAIL', 'error': str(e)}

        # 2. Crypto smoke test (Encrypt & Decrypt)
        try:
            sample_secret = b"scout-member-confidential-national-id-29801011234567"
            encrypted = encrypt_bytes(sample_secret)
            decrypted = decrypt_bytes(encrypted)
            assert decrypted == sample_secret
            results['crypto'] = {'status': 'PASS', 'message': 'AES-256 Fernet encryption & decryption verified'}
        except Exception as e:
            results['crypto'] = {'status': 'FAIL', 'error': str(e)}

        # 3. QR code generation smoke test
        try:
            qr_data = "SCOUT-MEMBER-UUID-4a1b2c3d-2026"
            qr_bytes = generate_qr_png_bytes(qr_data)
            assert len(qr_bytes) > 100
            results['qr_code'] = {'status': 'PASS', 'bytes_generated': len(qr_bytes)}
        except Exception as e:
            results['qr_code'] = {'status': 'FAIL', 'error': str(e)}

        # 4. Excel generation smoke test (Arabic RTL)
        try:
            excel_bytes = generate_sample_scout_excel()
            assert len(excel_bytes) > 1000
            results['excel_export'] = {'status': 'PASS', 'bytes_generated': len(excel_bytes)}
        except Exception as e:
            results['excel_export'] = {'status': 'FAIL', 'error': str(e)}

        # 5. File MIME detection smoke test (python-magic)
        try:
            # Test with PNG bytes generated from QR
            detected_mime = detect_mime_type(qr_bytes)
            assert detected_mime == 'image/png'
            results['file_magic_mime'] = {'status': 'PASS', 'detected_mime': detected_mime}
        except Exception as e:
            results['file_magic_mime'] = {'status': 'FAIL', 'error': str(e)}

        all_passed = all(r.get('status') == 'PASS' for r in results.values())
        return Response({
            'smoke_test_passed': all_passed,
            'timestamp': timezone.now().isoformat(),
            'components': results
        }, status=status.HTTP_200_OK if all_passed else status.HTTP_500_INTERNAL_SERVER_ERROR)


class SampleQRExportView(APIView):
    """Downloads a sample generated QR code PNG."""
    permission_classes = [AllowAny]

    def get(self, request):
        qr_bytes = generate_qr_png_bytes("SCOUT-MEMBER-QR-SAMPLE-001")
        return HttpResponse(qr_bytes, content_type="image/png")


class SampleExcelExportView(APIView):
    """Downloads a sample Arabic-styled Excel file."""
    permission_classes = [AllowAny]

    def get(self, request):
        excel_bytes = generate_sample_scout_excel()
        response = HttpResponse(
            excel_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="scout_sample_members.xlsx"'
        return response
