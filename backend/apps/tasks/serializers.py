from rest_framework import serializers
from .models import Task, TaskAssignment, TaskComment, TaskPriority, TaskStatus

class TaskCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'user_name', 'text', 'created_at']
        read_only_fields = ['user']

class TaskAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = TaskAssignment
        fields = ['id', 'task', 'user', 'user_name', 'is_primary']

class TaskSerializer(serializers.ModelSerializer):
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'priority_display',
            'status', 'status_display', 'deadline', 'created_by', 'created_by_name',
            'assignments', 'comments'
        ]
        read_only_fields = ['created_by']
