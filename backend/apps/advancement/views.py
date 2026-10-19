from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Badge, Requirement, AdvancementRecord
from .serializers import BadgeSerializer, RequirementSerializer, AdvancementRecordSerializer, MemberBadgeProgressSerializer
from apps.users.permissions import BaseScopedPermission

class BadgeViewSet(viewsets.ModelViewSet):
    """
    إدارة الشارات والمتطلبات
    """
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

class RequirementViewSet(viewsets.ModelViewSet):
    """
    إدارة المتطلبات التفصيلية لكل شارة
    """
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

class AdvancementViewSet(viewsets.ModelViewSet):
    """
    إدارة تقدم الأفراد في الشارات
    """
    queryset = AdvancementRecord.objects.all()
    serializer_class = AdvancementRecordSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()

        # Filter by the user's scope (Team/Stage/Patrol)
        scope_ids = self.request.user.scope_accesses.filter(
            scope_type='STAGE' # Simplified for example
        ).values_list('scope_id', flat=True)

        return self.queryset.filter(member__stage_id__in=scope_ids)

    @action(detail=False, methods=['get'], url_path='member/(?P<member_id>[^/.]+)')
    def member_progress(self, request, member_id=None):
        """
        عرض التقدم التفصيلي لفرد معين في جميع الشارات
        """
        records = AdvancementRecord.objects.filter(member_id=member_id).select_related('requirement__badge')
        serializer = MemberBadgeProgressSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-complete')
    def mark_complete(self, request):
        """
        تحديث حالة متطلب إلى 'مكتمل'
        """
        record_id = request.data.get('record_id')
        if not record_id:
            return Response({"error": "record_id مطلوب"}, status=status.HTTP_400_BAD_REQUEST)

        record = get_object_or_404(AdvancementRecord, pk=record_id)
        record.is_completed = True
        record.evaluated_by = request.user
        record.save()

        return Response({"message": "تم تحديث حالة المتطلب بنجاح"})
