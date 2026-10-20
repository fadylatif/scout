from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import Task, TaskAssignment, TaskComment
from .serializers import TaskSerializer, TaskAssignmentSerializer, TaskCommentSerializer
from apps.users.permissions import BaseScopedPermission

class TaskViewSet(viewsets.ModelViewSet):
    """
    إدارة لوحة المهام الإدارية
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        # Users see tasks they created or are assigned to
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()

        return Task.objects.filter(
            Q(created_by=user) |
            Q(assignments__user=user)
        ).distinct()

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_user(self, request, pk=None):
        """
        تخصيص المهمة لمستخدم معين
        """
        task = self.get_object()
        user_id = request.data.get('user_id')
        is_primary = request.data.get('is_primary', False)

        if not user_id:
            return Response({"error": "user_id مطلوب"}, status=status.HTTP_400_BAD_REQUEST)

        assignment, created = TaskAssignment.objects.get_or_create(
            task=task,
            user_id=user_id,
            defaults={'is_primary': is_primary}
        )

        if not created and is_primary:
            # Ensure only one primary assignee
            TaskAssignment.objects.filter(task=task, is_primary=True).update(is_primary=False)
            assignment.is_primary = True
            assignment.save()

        return Response({"message": "تم تخصيص المهمة بنجاح"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='comment')
    def add_comment(self, request, pk=None):
        """
        إضافة تعليق أو تحديث للمهمة
        """
        task = self.get_object()
        text = request.data.get('text')

        if not text:
            return Response({"error": "نص التعليق مطلوب"}, status=status.HTTP_400_BAD_REQUEST)

        comment = TaskComment.objects.create(
            task=task,
            user=request.user,
            text=text
        )

        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
