from rest_framework import serializers
from .models import Activity, ActivityInstance, ActivityLocation


class ActivityLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLocation
        fields = '__all__'


class ActivityInstanceSerializer(serializers.ModelSerializer):
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    activity_type = serializers.CharField(source='activity.activity_type', read_only=True)

    class Meta:
        model = ActivityInstance
        fields = '__all__'


class ActivitySerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    instances_count = serializers.SerializerMethodField()
    teams_data = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    next_instance = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['created_by']

    def get_instances_count(self, obj):
        return obj.instances.count()

    def get_teams_data(self, obj):
        return [{'id': str(t.id), 'name': t.name} for t in obj.teams.all()]

    def get_next_instance(self, obj):
        from django.utils import timezone
        inst = obj.instances.filter(
            start_time__gte=timezone.now(),
            is_cancelled=False
        ).order_by('start_time').first()
        if inst:
            return {'id': str(inst.id), 'start_time': inst.start_time}
        return None
