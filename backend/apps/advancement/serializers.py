from rest_framework import serializers
from .models import Badge, Requirement, AdvancementRecord

class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = '__all__'

class BadgeSerializer(serializers.ModelSerializer):
    requirements = RequirementSerializer(many=True, read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = '__all__'

    def get_progress_percentage(self, obj):
        # This is a general progress for all members (not useful in list)
        # In a member-specific view, this would be calculated per member
        return 0

class MemberBadgeProgressSerializer(serializers.ModelSerializer):
    """
    Serializer to show a member's progress for a specific badge.
    """
    badge_name = serializers.CharField(source='requirement.badge.name', read_only=True)
    requirement_title = serializers.CharField(source='requirement.title', read_only=True)

    class Meta:
        model = AdvancementRecord
        fields = ['id', 'requirement', 'requirement_title', 'badge_name', 'is_completed', 'completion_date', 'evaluated_by', 'notes']

class AdvancementRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvancementRecord
        fields = '__all__'
