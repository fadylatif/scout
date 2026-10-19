from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import AttendanceSession, AttendanceRecord, AttendanceExcuse, AttendanceStatus
from .serializers import AttendanceSessionSerializer, AttendanceRecordSerializer, AttendanceExcuseSerializer
from apps.users.permissions import BaseScopedPermission

class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """
    إدارة جلسات الحضور: إنشاء، تعديل، عرض
    """
    queryset = AttendanceSession.objects.all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """
    إدارة سجلات الحضور: تسجيل حضور، تعديل حالة
    """
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def get_queryset(self):
        # Apply scope filtering: Only show records for the user's assigned unit
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()

        # Filter by the user's scope access
        scope_ids = self.request.user.scope_accesses.filter(
            scope_type='STAGE' # Example: filtering by Stage scope
        ).values_list('scope_id', flat=True)

        return self.queryset.filter(session__unit_id__in=scope_ids)

class QRCheckInView(generics.GenericAPIView):
    """
    تسجيل حضور سريع عبر مسح كود QR
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        session_id = request.data.get('session_id')
        member_id = request.data.get('member_id')

        if not session_id or not member_id:
            return Response(
                {"error": "Session ID and Member ID are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = get_object_or_404(AttendanceSession, pk=session_id)

        # Create or update the record
        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member_id=member_id,
            defaults={'status': AttendanceStatus.PRESENT, 'check_in_time': timezone.now()}
        )

        if not created:
            record.status = AttendanceStatus.PRESENT
            record.check_in_time = timezone.now()
            record.save()

        return Response(
            {"message": "Attendance marked successfully", "record_id": record.id},
            status=status.HTTP_200_OK
        )

class AttendanceExcuseViewSet(viewsets.ModelViewSet):
    """
    إدارة أعذار الغياب
    """
    queryset = AttendanceExcuse.objects.all()
    serializer_class = AttendanceExcuseSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def perform_update(self, serializer):
        # Auto-update the AttendanceRecord status when an excuse is approved
        instance = serializer.save()
        if instance.is_approved:
            record = instance.record
            record.status = AttendanceStatus.EXCUSED
            record.save()
