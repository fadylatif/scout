from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord, AttendanceExcuse, AttendanceStatus, ExcuseStatus
from apps.members.models import Member
from apps.structure.models import Team, Stage, Group


class AttendanceExcuseSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='record.member.full_name', read_only=True)
    stage_code = serializers.CharField(source='record.member.stage_code', read_only=True)
    session_title = serializers.CharField(source='record.session.title', read_only=True)
    session_date = serializers.DateTimeField(source='record.session.date', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AttendanceExcuse
        fields = [
            'id', 'record', 'member_name', 'stage_code', 'session_title', 'session_date',
            'reason', 'document', 'status', 'status_display', 'is_approved', 'rejection_reason',
            'approved_by', 'approved_by_name', 'approval_date', 'created_at'
        ]
        read_only_fields = ['is_approved', 'approved_by', 'approval_date', 'created_at']


class AttendanceRecordSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    stage_code = serializers.CharField(source='member.stage_code', read_only=True)
    member_photo = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='member.team.name', read_only=True)
    patrol_name = serializers.CharField(source='member.patrol.name', read_only=True)
    has_excuse = serializers.SerializerMethodField()
    excuse_id = serializers.SerializerMethodField()
    excuse_status = serializers.SerializerMethodField()
    excuse_reason = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'session', 'member', 'member_name', 'stage_code', 'member_photo',
            'team_name', 'patrol_name', 'status', 'status_display',
            'check_in_time', 'notes', 'has_excuse', 'excuse_id', 'excuse_status', 'excuse_reason'
        ]

    def get_member_photo(self, obj):
        if obj.member and obj.member.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.member.photo.url)
            return obj.member.photo.url
        return None

    def get_has_excuse(self, obj):
        return hasattr(obj, 'excuse')

    def get_excuse_id(self, obj):
        return obj.excuse.id if hasattr(obj, 'excuse') else None

    def get_excuse_status(self, obj):
        return obj.excuse.status if hasattr(obj, 'excuse') else None

    def get_excuse_reason(self, obj):
        return obj.excuse.reason if hasattr(obj, 'excuse') else None


class AttendanceSessionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    unit_name = serializers.SerializerMethodField()
    total_records = serializers.SerializerMethodField()
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    excused_count = serializers.SerializerMethodField()
    late_count = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'title', 'date', 'location', 'description',
            'unit_id', 'unit_name', 'created_by', 'created_by_name',
            'total_records', 'present_count', 'absent_count', 'excused_count', 'late_count',
            'attendance_rate', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_unit_name(self, obj):
        if not obj.unit_id:
            return 'المجموعة العامة'
        # Check Team, Stage, Group
        team = Team.objects.filter(pk=obj.unit_id).first()
        if team:
            return f'فريق: {team.name}'
        stage = Stage.objects.filter(pk=obj.unit_id).first()
        if stage:
            return f'مرحلة: {stage.name}'
        group = Group.objects.filter(pk=obj.unit_id).first()
        if group:
            return f'مجموعة: {group.name}'
        return str(obj.unit_id)

    def get_total_records(self, obj):
        return obj.records.count()

    def get_present_count(self, obj):
        return obj.records.filter(status=AttendanceStatus.PRESENT).count()

    def get_absent_count(self, obj):
        return obj.records.filter(status=AttendanceStatus.ABSENT).count()

    def get_excused_count(self, obj):
        return obj.records.filter(status=AttendanceStatus.EXCUSED).count()

    def get_late_count(self, obj):
        return obj.records.filter(status=AttendanceStatus.LATE).count()

    def get_attendance_rate(self, obj):
        total = self.get_total_records(obj)
        if total == 0:
            return 0
        present = self.get_present_count(obj) + self.get_late_count(obj)
        return round((present / total) * 100, 1)
