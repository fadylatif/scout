from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord, AttendanceExcuse, AttendanceStatus

class AttendanceExcuseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceExcuse
        fields = '__all__'

class AttendanceRecordSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'session', 'member', 'member_name',
            'status', 'status_display', 'check_in_time', 'notes'
        ]

class AttendanceSessionSerializer(serializers.ModelSerializer):
    records_count = serializers.IntegerField(read_only=True)
    present_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'title', 'date', 'location', 'description',
            'unit_id', 'created_by', 'records_count', 'present_count'
        ]
        read_only_fields = ['created_by']

    def get_records_count(self, obj):
        return obj.records.count()

    def get_present_count(self, obj):
        return obj.records.filter(status=AttendanceStatus.PRESENT).count()
