from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend

from .models import Activity, ActivityInstance, ActivityLocation
from .serializers import ActivitySerializer, ActivityInstanceSerializer, ActivityLocationSerializer
from apps.users.permissions import BaseScopedPermission


class ActivityLocationViewSet(viewsets.ModelViewSet):
    """إدارة مواقع الأنشطة"""
    queryset = ActivityLocation.objects.all()
    serializer_class = ActivityLocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'address']


class ActivityViewSet(viewsets.ModelViewSet):
    """إدارة الأنشطة والاجتماعات — يدعم التكرار والفرق المتعددة"""
    queryset = Activity.objects.select_related('location', 'created_by').prefetch_related('teams', 'instances')
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activity_type', 'is_recurring', 'teams']
    search_fields = ['title', 'description']
    ordering_fields = ['start_date', 'title']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate_instances(self, request, pk=None):
        """
        توليد نسخ فعلية للنشاط بناءً على قواعد التكرار (نافذة 90 يوماً)
        """
        activity = self.get_object()
        if not activity.is_recurring:
            return Response(
                {"error": "هذا النشاط ليس متكرراً"},
                status=status.HTTP_400_BAD_REQUEST
            )

        start = activity.start_date
        end_limit = activity.end_date or (start + timedelta(days=90))
        created_count = 0
        current = start

        while current <= end_limit:
            _, created = ActivityInstance.objects.get_or_create(
                activity=activity,
                start_time=current,
                defaults={'end_time': current + timedelta(hours=2)}
            )
            if created:
                created_count += 1

            if activity.frequency == 'DAILY':
                current += timedelta(days=1)
            elif activity.frequency == 'WEEKLY':
                current += timedelta(weeks=1)
            elif activity.frequency == 'MONTHLY':
                # تقريبي — إضافة 30 يوماً
                current += timedelta(days=30)
            else:
                break

        return Response({
            "message": f"تم توليد {created_count} نسخة جديدة",
            "created": created_count
        })

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        بيانات التقويم — نسخ الأنشطة ضمن نطاق تاريخي
        GET /api/activities/activities/calendar/?start=2026-10-01&end=2026-10-31
        """
        start_str = request.query_params.get('start')
        end_str = request.query_params.get('end')

        if not start_str or not end_str:
            return Response(
                {"error": "مطلوب تحديد start وend"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from datetime import datetime
        try:
            start_dt = datetime.fromisoformat(start_str)
            end_dt = datetime.fromisoformat(end_str)
        except ValueError:
            return Response({"error": "صيغة تاريخ غير صحيحة"}, status=status.HTTP_400_BAD_REQUEST)

        instances = ActivityInstance.objects.filter(
            start_time__gte=start_dt,
            start_time__lte=end_dt,
        ).select_related('activity', 'activity__location').order_by('start_time')

        events = []
        for inst in instances:
            events.append({
                'id': str(inst.id),
                'title': inst.activity.title,
                'start': inst.start_time.isoformat(),
                'end': inst.end_time.isoformat(),
                'type': inst.activity.activity_type,
                'type_display': inst.activity.get_activity_type_display(),
                'location': inst.activity.location.name if inst.activity.location else '',
                'is_cancelled': inst.is_cancelled,
                'cancel_reason': inst.cancel_reason,
                'activity_id': str(inst.activity.id),
            })

        # أيضاً أنشطة غير متكررة (one-shot) ضمن النطاق
        single_activities = Activity.objects.filter(
            is_recurring=False,
            start_date__gte=start_dt,
            start_date__lte=end_dt,
            deleted_at__isnull=True,
        ).select_related('location')

        for act in single_activities:
            events.append({
                'id': f"act-{act.id}",
                'title': act.title,
                'start': act.start_date.isoformat(),
                'end': (act.end_date or act.start_date + timedelta(hours=2)).isoformat(),
                'type': act.activity_type,
                'type_display': act.get_activity_type_display(),
                'location': act.location.name if act.location else '',
                'is_cancelled': False,
                'activity_id': str(act.id),
            })

        events.sort(key=lambda e: e['start'])
        return Response(events)


class ActivityInstanceViewSet(viewsets.ModelViewSet):
    """إدارة نسخ الأنشطة (التقويم)"""
    queryset = ActivityInstance.objects.select_related('activity', 'activity__location')
    serializer_class = ActivityInstanceSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['activity', 'is_cancelled']
    ordering_fields = ['start_time']

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """إلغاء نسخة نشاط مع تسجيل سبب الإلغاء"""
        instance = self.get_object()
        reason = request.data.get('reason', '')
        instance.is_cancelled = True
        instance.cancel_reason = reason
        instance.save()
        return Response({'message': 'تم إلغاء النسخة', 'id': str(instance.id)})
