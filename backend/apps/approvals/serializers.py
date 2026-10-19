from rest_framework import serializers
from .models import ApprovalRequest, ApprovalAction, ApprovalStatus

class ApprovalActionSerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source='action_by.full_name', read_only=True)

    class Meta:
        model = ApprovalAction
        fields = ['id', 'request', 'action_by', 'action_by_name', 'decision', 'comment', 'created_at']
        read_only_fields = ['action_by']

class ApprovalRequestSerializer(serializers.ModelSerializer):
    actions = ApprovalActionSerializer(many=True, read_only=True)
    requester_name = serializers.CharField(source='requester.full_name', read_only=True)
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'content_type', 'content_type_name', 'object_id',
            'requester', 'requester_name', 'status', 'priority', 'reason', 'created_at', 'actions'
        ]
        read_only_fields = ['requester', 'created_at']
