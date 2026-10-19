from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .models import Activity, ActivityInstance, ActivityLocation
from .serializers import ActivitySerializer, ActivityInstanceSerializer, ActivityLocationSerializer
from apps.users.permissions import BaseScopedPermission

class ActivityLocationViewSet(viewsets.ModelViewSet):
    """
    إدارة مواقع الأنشطة
    """
    queryset = ActivityLocation.objects.all()
    serializer_class = ActivityLocationSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

class ActivityViewSet(viewsets.ModelViewSet):
    """
    إدارة الأنشطة والاجتماعات
    """
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate_instances(self, request, pk=None):
        """
        توليد نسخ فعلية للنشاط بناءً على قواعد التكرار
        """
        activity = self.get_object()
        if not activity.is_recurring:
            return Response(
                {"error": "هذا النشاط ليس متكرراً"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Simple expansion logic for a 3-month window
        start = activity.start_date
        end_limit = start + timedelta(days=90)

        instances = []
        current_date = start

        while current_date <= end_limit:
            # Simple check for weekly recurrence (example)
            if activity.frequency == 'WEEKLY':
                ActivityInstance.objects.get_or_create(
                    activity=activity,
                    start_time=current_date,
                    end_time=current_date + timedelta(hours=2)
                )
                current_date += timedelta(days=7)
            else:
                # For other frequencies, this would be expanded in a real service
                break

        return Response({"message": "تم توليد النسخ بنجاح"})

class ActivityInstanceViewSet(viewsets.ModelViewSet):
    """
    إدارة نسخ الأنشطة (التقويم)
    """
    queryset = ActivityInstance.objects.all()
    serializer_class = ActivityInstanceSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]
