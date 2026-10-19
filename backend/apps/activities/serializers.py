from rest_framework import serializers
from .models import Activity, ActivityInstance, ActivityLocation, ActivityType

class ActivityLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLocation
        fields = '__all__'

class ActivityInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityInstance
        fields = '__all__'

class ActivitySerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    instances_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['created_by']

    def get_instances_count(self, obj):
        return obj.instances.count()
