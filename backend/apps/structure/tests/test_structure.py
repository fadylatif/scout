"""Tests for apps.structure — Organizational hierarchy, ScoutYear exclusivity, soft-delete, and audit logs."""
import pytest
from rest_framework.test import APIClient

from apps.common.models import AuditLog
from apps.structure.models import Group, Patrol, ScoutYear, Stage, Team
from apps.users.models import User, UserPermission


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin_user(db):
    u = User.objects.create_superuser(
        username='admin_structure',
        password='AdminPassword123!',
        full_name='أدمن الهيكل',
        role='ADMIN',
    )
    UserPermission.objects.create(
        user=u,
        permissions={'structure': {'view': True, 'add': True, 'edit': True, 'delete': True}},
    )
    return u


@pytest.fixture
def limited_user(db):
    u = User.objects.create_user(
        username='leader_readonly',
        password='LeaderPassword123!',
        full_name='قائد قراءة فقط',
        role='LEADER',
    )
    UserPermission.objects.create(
        user=u,
        permissions={'structure': {'view': True, 'add': False, 'edit': False, 'delete': False}},
    )
    return u


def test_create_group_audited(api, admin_user):
    api.force_authenticate(user=admin_user)
    payload = {
        'name': 'المجموعة البحرية الأولى',
        'type': 'NAVAL',
        'description': 'المجموعة البحرية لكاتدرائية أبي سيفين',
    }
    res = api.post('/api/groups/', payload, format='json')
    assert res.status_code == 201
    group_id = res.json()['id']
    assert Group.objects.filter(id=group_id).exists()
    assert AuditLog.objects.filter(action='CREATE', entity_type='Group', entity_id=str(group_id)).exists()


def test_create_stage_order(db):
    group = Group.objects.create(name='مجموعة الفتيان', type='SCOUT')
    s2 = Stage.objects.create(name='مرحلة المتقدم', group=group, order=2)
    s1 = Stage.objects.create(name='مرحلة الكشاف', group=group, order=1)

    stages = list(Stage.objects.filter(group=group))
    assert stages[0].id == s1.id
    assert stages[1].id == s2.id


def test_soft_delete_team_hidden(api, admin_user):
    api.force_authenticate(user=admin_user)
    group = Group.objects.create(name='مجموعة الدلتا', type='SCOUT')
    stage = Stage.objects.create(name='مرحلة الأشبال', group=group, order=1)
    team = Team.objects.create(name='فريق النجوم', stage=stage)

    res = api.delete(f'/api/teams/{team.id}/')
    assert res.status_code == 204

    # Soft deleted: absent in default manager, present in all_objects
    assert not Team.objects.filter(id=team.id).exists()
    assert Team.all_objects.filter(id=team.id).exists()
    assert Team.all_objects.get(id=team.id).is_deleted is True


def test_active_scout_year_uniqueness(db):
    y1 = ScoutYear.objects.create(
        name='2025-2026', start_date='2025-09-01', end_date='2026-06-30', is_active=True
    )
    assert ScoutYear.objects.filter(is_active=True).count() == 1

    y2 = ScoutYear.objects.create(
        name='2026-2027', start_date='2026-09-01', end_date='2027-06-30', is_active=True
    )
    y1.refresh_from_db()
    assert y1.is_active is False
    assert y2.is_active is True
    assert ScoutYear.objects.filter(is_active=True).count() == 1


def test_structure_permissions(api, limited_user):
    api.force_authenticate(user=limited_user)
    # Limited user cannot create group
    res = api.post('/api/groups/', {'name': 'مجموعة غير مصرح بها', 'type': 'SCOUT'}, format='json')
    assert res.status_code == 403
