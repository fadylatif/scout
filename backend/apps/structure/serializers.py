from rest_framework import serializers

from apps.structure.models import Group, Patrol, Sector, Stage, ScoutYear, Team


class ScoutYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoutYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'type', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SectorSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Sector
        fields = ['id', 'name', 'group', 'group_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'group_name', 'created_at', 'updated_at']


class StageSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Stage
        fields = ['id', 'name', 'group', 'group_name', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'group_name', 'created_at', 'updated_at']


class PatrolSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)

    class Meta:
        model = Patrol
        fields = ['id', 'name', 'team', 'team_name', 'leader', 'leader_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'team_name', 'leader_name', 'created_at', 'updated_at']


class TeamSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    patrols = PatrolSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'stage', 'stage_name', 'sector', 'sector_name',
            'leader', 'leader_name', 'description', 'patrols', 'member_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'stage_name', 'sector_name', 'leader_name', 'patrols', 'member_count', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()


class TeamListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'stage', 'stage_name', 'leader', 'leader_name', 'member_count']
        read_only_fields = fields

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()


class GroupTreeSerializer(serializers.ModelSerializer):
    """Full tree: group → stages → teams → patrols."""
    stages = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'type', 'stages']

    def get_stages(self, obj):
        stages = obj.stages.filter(deleted_at__isnull=True).order_by('order')
        return StageWithTeamsSerializer(stages, many=True).data


class StageWithTeamsSerializer(serializers.ModelSerializer):
    teams = TeamListSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ['id', 'name', 'order', 'teams']
