from rest_framework import generics, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.models import AuditLog
from apps.members.serializers import _check_perm
from apps.structure.models import Group, Patrol, Sector, Stage, ScoutYear, Team
from apps.structure.serializers import (
    GroupSerializer,
    GroupTreeSerializer,
    PatrolSerializer,
    ScoutYearSerializer,
    SectorSerializer,
    StageSerializer,
    TeamListSerializer,
    TeamSerializer,
)


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _audit(request, action, entity_type, obj, old=None, new=None):
    AuditLog.objects.create(
        action=action, user=request.user,
        entity_type=entity_type, entity_id=str(obj.pk),
        description=str(obj), ip_address=_get_client_ip(request) or None,
        old_values=old, new_values=new,
    )


# ─── Scout Years ────────────────────────────────────────────────────────────

class ScoutYearListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ScoutYear.objects.all().order_by('-start_date')
    serializer_class = ScoutYearSerializer
    filterset_fields = ['is_active']

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'ScoutYear', obj)


class ScoutYearDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ScoutYear.objects.all()
    serializer_class = ScoutYearSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = ScoutYearSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'ScoutYear', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'ScoutYear', instance)
        instance.delete()


# ─── Groups ─────────────────────────────────────────────────────────────────

class GroupListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GroupSerializer
    filterset_fields = ['type']
    search_fields = ['name']

    def get_queryset(self):
        return Group.objects.filter(deleted_at__isnull=True).order_by('name')

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'Group', obj)


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Group.objects.filter(deleted_at__isnull=True)
    serializer_class = GroupSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = GroupSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'Group', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'Group', instance)
        instance.delete()


class GroupTreeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _check_perm(request.user, 'structure', 'view')
        groups = Group.objects.filter(deleted_at__isnull=True).order_by('name')
        return Response(GroupTreeSerializer(groups, many=True).data)


# ─── Sectors ────────────────────────────────────────────────────────────────

class SectorListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SectorSerializer
    filterset_fields = ['group']
    search_fields = ['name']

    def get_queryset(self):
        return Sector.objects.filter(deleted_at__isnull=True).select_related('group').order_by('name')

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'Sector', obj)


class SectorDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Sector.objects.filter(deleted_at__isnull=True)
    serializer_class = SectorSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = SectorSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'Sector', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'Sector', instance)
        instance.delete()


# ─── Stages ─────────────────────────────────────────────────────────────────

class StageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StageSerializer
    filterset_fields = ['group']
    search_fields = ['name']

    def get_queryset(self):
        return Stage.objects.filter(deleted_at__isnull=True).select_related('group').order_by('order')

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'Stage', obj)


class StageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Stage.objects.filter(deleted_at__isnull=True)
    serializer_class = StageSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = StageSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'Stage', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'Stage', instance)
        instance.delete()


# ─── Teams ──────────────────────────────────────────────────────────────────

class TeamListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['stage', 'sector']
    search_fields = ['name']

    def get_serializer_class(self):
        return TeamSerializer if self.request.method == 'POST' else TeamListSerializer

    def get_queryset(self):
        _check_perm(self.request.user, 'structure', 'view')
        qs = Team.objects.filter(deleted_at__isnull=True).select_related('stage', 'sector', 'leader')
        user = self.request.user
        if user.role != 'ADMIN':
            scope_ids = set(user.scope_accesses.filter(scope_type='TEAM').values_list('scope_id', flat=True))
            stage_ids = set(user.scope_accesses.filter(scope_type='STAGE').values_list('scope_id', flat=True))
            if scope_ids or stage_ids:
                from django.db.models import Q
                qs = qs.filter(Q(id__in=scope_ids) | Q(stage_id__in=stage_ids))
        return qs.order_by('name')

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'Team', obj)


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.filter(deleted_at__isnull=True).select_related('stage', 'sector', 'leader')
    serializer_class = TeamSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = TeamSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'Team', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'Team', instance)
        instance.delete()


# ─── Patrols ────────────────────────────────────────────────────────────────

class PatrolListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PatrolSerializer
    filterset_fields = ['team']
    search_fields = ['name']

    def get_queryset(self):
        return Patrol.objects.filter(deleted_at__isnull=True).select_related('team', 'leader').order_by('name')

    def perform_create(self, serializer):
        _check_perm(self.request.user, 'structure', 'add')
        obj = serializer.save()
        _audit(self.request, 'CREATE', 'Patrol', obj)


class PatrolDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Patrol.objects.filter(deleted_at__isnull=True)
    serializer_class = PatrolSerializer

    def perform_update(self, serializer):
        _check_perm(self.request.user, 'structure', 'edit')
        old = PatrolSerializer(self.get_object()).data
        obj = serializer.save()
        _audit(self.request, 'UPDATE', 'Patrol', obj, old=dict(old))

    def perform_destroy(self, instance):
        _check_perm(self.request.user, 'structure', 'delete')
        _audit(self.request, 'DELETE', 'Patrol', instance)
        instance.delete()
