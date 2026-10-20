import uuid
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.models import AuditLog
from apps.members.models import Member
from apps.structure.models import Stage, Team
from .models import (
    AttendanceExcuse,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    ExcuseStatus,
)
from .serializers import (
    AttendanceExcuseSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
)


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """
    إدارة جلسات الحضور (عرض، إنشاء، تعديل، حذف منطقي)
    """
    queryset = AttendanceSession.objects.all().order_by('-date')
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()

        # Get scoped IDs
        scoped_ids = set(user.scope_accesses.values_list('scope_id', flat=True))
        if not scoped_ids:
            return self.queryset.filter(created_by=user)

        return self.queryset.filter(
            Q(unit_id__in=scoped_ids) |
            Q(created_by=user) |
            Q(unit_id__isnull=True)
        ).distinct()

    def perform_create(self, serializer):
        session = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            action='CREATE',
            user=self.request.user,
            entity_type='AttendanceSession',
            entity_id=str(session.id),
            description=f'إنشاء جلسة حضور: {session.title}',
            ip_address=_get_client_ip(self.request) or None,
            new_values={'title': session.title, 'date': str(session.date), 'unit_id': str(session.unit_id) if session.unit_id else None},
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            action='DELETE',
            user=self.request.user,
            entity_type='AttendanceSession',
            entity_id=str(instance.id),
            description=f'حذف جلسة حضور: {instance.title}',
            ip_address=_get_client_ip(self.request) or None,
        )
        instance.delete()

    @action(detail=True, methods=['post'], url_path='populate')
    def populate_members(self, request, pk=None):
        """
        تعبئة أفراد الوحدة تلقائياً في الجلسة كـ (غائب) ليتم مسح الحضور عليهم
        """
        session = self.get_object()
        members_qs = Member.objects.filter(is_active=True)

        if session.unit_id:
            # Check if unit_id is a Team or Stage
            is_team = Team.objects.filter(pk=session.unit_id).exists()
            is_stage = Stage.objects.filter(pk=session.unit_id).exists()

            if is_team:
                members_qs = members_qs.filter(team_id=session.unit_id)
            elif is_stage:
                members_qs = members_qs.filter(stage_id=session.unit_id)

        existing_member_ids = set(
            session.records.values_list('member_id', flat=True)
        )

        to_create = []
        for member in members_qs:
            if member.id not in existing_member_ids:
                to_create.append(
                    AttendanceRecord(
                        session=session,
                        member=member,
                        status=AttendanceStatus.ABSENT,
                    )
                )

        if to_create:
            AttendanceRecord.objects.bulk_create(to_create)

        return Response({
            'message': f'تمت تعبئة {len(to_create)} فرداً في الجلسة بنجاح.',
            'populated_count': len(to_create),
            'total_records': session.records.count(),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        """إحصائيات فورية للجلسة"""
        session = self.get_object()
        serializer = self.get_serializer(session)
        return Response(serializer.data)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """
    إدارة سجلات الحضور: عرض، وتعديل الحالة والملاحظات
    """
    queryset = AttendanceRecord.objects.select_related('member', 'session', 'excuse').all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(member__full_name__icontains=search) |
                Q(member__stage_code__icontains=search)
            )

        return qs.order_by('member__full_name')

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated = serializer.save()

        if old_status != updated.status:
            AuditLog.objects.create(
                action='UPDATE',
                user=self.request.user,
                entity_type='AttendanceRecord',
                entity_id=str(updated.id),
                description=f'تعديل حالة حضور {updated.member.full_name} من {old_status} إلى {updated.status}',
                ip_address=_get_client_ip(self.request) or None,
                old_values={'status': old_status},
                new_values={'status': updated.status, 'notes': updated.notes},
            )

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """تعديل دفعة سجلات دفعة واحدة (مثلاً تحويل كل المتبقي إلى غائب)"""
        record_ids = request.data.get('record_ids', [])
        new_status = request.data.get('status')

        if not record_ids or not new_status:
            return Response(
                {'error': 'يجب تحديد معرفات السجلات والحالة الجديدة.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_count = AttendanceRecord.objects.filter(id__in=record_ids).update(status=new_status)

        AuditLog.objects.create(
            action='UPDATE',
            user=request.user,
            entity_type='AttendanceRecord',
            entity_id='',
            description=f'تعديل جماعي لحالة {updated_count} سجلاً إلى {new_status}',
            ip_address=_get_client_ip(request) or None,
            new_values={'status': new_status, 'count': updated_count},
        )

        return Response({
            'message': f'تم تحديث {updated_count} سجلاً بنجاح.',
            'updated_count': updated_count,
        })


class QRCheckInView(generics.GenericAPIView):
    """
    تسجيل حضور سريع عبر مسح كود QR مع منع التكرار وتسجيل التدقيق
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        session_id = request.data.get('session_id')
        qr_data = str(request.data.get('qr_data', '')).strip()

        if not session_id or not qr_data:
            return Response(
                {'error': 'معرف الجلسة وبيانات الـ QR مطلوبة.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = get_object_or_404(AttendanceSession, pk=session_id)

        # 1. Resolve Member by UUID or stage_code
        member = None
        try:
            val = uuid.UUID(qr_data)
            member = Member.objects.filter(pk=val, is_active=True).first()
        except (ValueError, TypeError):
            pass

        if not member:
            member = Member.objects.filter(stage_code__iexact=qr_data, is_active=True).first()

        if not member:
            return Response(
                {'error': f'لم يتم العثور على فرد نشط بالرمز أو الكود: "{qr_data}".'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Check for duplicate check-in (Requirement: prevent duplicate attendance in the same session)
        record, created = AttendanceRecord.objects.get_or_create(
            session=session,
            member=member,
            defaults={
                'status': AttendanceStatus.PRESENT,
                'check_in_time': timezone.now(),
            },
        )

        now = timezone.now()
        photo_url = request.build_absolute_uri(member.photo.url) if member.photo else None

        member_payload = {
            'id': str(member.id),
            'full_name': member.full_name,
            'stage_code': member.stage_code,
            'team_name': member.team.name if member.team else '',
            'photo_url': photo_url,
        }

        if not created:
            if record.status == AttendanceStatus.PRESENT:
                # Already present -> notify UI without altering record
                return Response({
                    'status': 'ALREADY_CHECKED_IN',
                    'message': f'الفرد "{member.full_name}" مسجل حاضر بالفعل في هذه الجلسة مسبقاً!',
                    'check_in_time': record.check_in_time,
                    'member': member_payload,
                    'record_id': str(record.id),
                }, status=status.HTTP_200_OK)

            # Was ABSENT or EXCUSED -> change to PRESENT
            record.status = AttendanceStatus.PRESENT
            record.check_in_time = now
            record.save()

        # 3. Audit trail for the QR scan
        AuditLog.objects.create(
            action='UPDATE' if not created else 'CREATE',
            user=request.user,
            entity_type='AttendanceRecord',
            entity_id=str(record.id),
            description=f'مسح QR: تسجيل حضور {member.full_name} في جلسة {session.title}',
            ip_address=_get_client_ip(request) or None,
            new_values={'member': member.full_name, 'check_in_time': str(now), 'scanner': request.user.username},
        )

        return Response({
            'status': 'CHECKED_IN',
            'message': f'تم تسجيل حضور "{member.full_name}" بنجاح.',
            'check_in_time': now,
            'member': member_payload,
            'record_id': str(record.id),
        }, status=status.HTTP_200_OK)


class AttendanceExcuseViewSet(viewsets.ModelViewSet):
    """
    إدارة أعذار الغياب والاعتماد/الرفض مع سجل القرارات
    """
    queryset = AttendanceExcuse.objects.select_related('record__member', 'record__session', 'approved_by').all().order_by('-created_at')
    serializer_class = AttendanceExcuseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(record__session_id=session_id)

        return qs

    def perform_create(self, serializer):
        excuse = serializer.save()
        AuditLog.objects.create(
            action='CREATE',
            user=self.request.user,
            entity_type='AttendanceExcuse',
            entity_id=str(excuse.id),
            description=f'تقديم عذر غياب لـ {excuse.record.member.full_name}',
            ip_address=_get_client_ip(self.request) or None,
            new_values={'reason': excuse.reason},
        )

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """اعتماد العذر وتحويل حالة الفرد إلى (بعذر)"""
        excuse = self.get_object()
        excuse.status = ExcuseStatus.APPROVED
        excuse.is_approved = True
        excuse.approved_by = request.user
        excuse.approval_date = timezone.now()
        excuse.save()

        # Automatically update the attendance record status
        record = excuse.record
        record.status = AttendanceStatus.EXCUSED
        record.save()

        AuditLog.objects.create(
            action='APPROVAL',
            user=request.user,
            entity_type='AttendanceExcuse',
            entity_id=str(excuse.id),
            description=f'اعتماد عذر غياب لـ {record.member.full_name} في جلسة {record.session.title}',
            ip_address=_get_client_ip(request) or None,
            new_values={'status': 'APPROVED', 'approver': request.user.username},
        )

        return Response({
            'message': 'تم اعتماد العذر بنجاح وتحديث حالة الحضور إلى (بعذر).',
            'excuse': AttendanceExcuseSerializer(excuse, context={'request': request}).data,
        })

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """رفض العذر مع توثيق سبب الرفض"""
        excuse = self.get_object()
        reason = request.data.get('reason', '')
        if not reason:
            return Response({'error': 'يجب توضيح سبب الرفض.'}, status=status.HTTP_400_BAD_REQUEST)

        excuse.status = ExcuseStatus.REJECTED
        excuse.is_approved = False
        excuse.rejection_reason = reason
        excuse.approved_by = request.user
        excuse.approval_date = timezone.now()
        excuse.save()

        AuditLog.objects.create(
            action='APPROVAL',
            user=request.user,
            entity_type='AttendanceExcuse',
            entity_id=str(excuse.id),
            description=f'رفض عذر غياب لـ {excuse.record.member.full_name}: {reason}',
            ip_address=_get_client_ip(request) or None,
            new_values={'status': 'REJECTED', 'reason': reason, 'approver': request.user.username},
        )

        return Response({
            'message': 'تم رفض العذر وحفظ سبب الرفض.',
            'excuse': AttendanceExcuseSerializer(excuse, context={'request': request}).data,
        })
