from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import ApprovalRequest, ApprovalAction, ApprovalStatus
from .serializers import ApprovalRequestSerializer, ApprovalActionSerializer
from apps.users.permissions import BaseScopedPermission

class ApprovalRequestViewSet(viewsets.ModelViewSet):
    """
    إدارة طلبات الاعتماد والقرارات
    """
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()

        # Leaders see requests that need their approval or requests they submitted
        return ApprovalRequest.objects.filter(
            Q(requester=user) |
            Q(status=ApprovalStatus.PENDING)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'], url_path='decide')
    def decide(self, request, pk=None):
        """
        اتخاذ قرار بشأن الطلب (موافقة / رفض)
        """
        approval_request = self.get_object()
        decision = request.data.get('decision')
        comment = request.data.get('comment', '')

        if decision not in ApprovalStatus.values:
            return Response(
                {"error": "قرار غير صالح. اختر من (APPROVED, REJECTED, INFO_REQUESTED)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Record the action
        ApprovalAction.objects.create(
            request=approval_request,
            action_by=request.user,
            decision=decision,
            comment=comment
        )

        # 2. Update the request status
        approval_request.status = decision
        approval_request.save()

        # 3. Integration Hook: Notify the linked object
        # In a real system, we would use a signal or a registry of handlers
        self._handle_object_update(approval_request, decision)

        return Response({"message": "تم اتخاذ القرار بنجاح"}, status=status.HTTP_200_OK)

    def _handle_object_update(self, request_obj, decision):
        """
        تحديث الكيان المرتبط بناءً على قرار الاعتماد
        """
        target = request_obj.content_object
        if not target:
            return

        # Example: If it's an AttendanceExcuse, update the record status
        if hasattr(target, 'record'): # AttendanceExcuse
            if decision == ApprovalStatus.APPROVED:
                target.record.status = 'EXCUSED'
                target.record.save()

        # Example: If it's an AdvancementRecord, mark as completed
        if hasattr(target, 'is_completed'): # AdvancementRecord
            if decision == ApprovalStatus.APPROVED:
                target.is_completed = True
                target.save()
