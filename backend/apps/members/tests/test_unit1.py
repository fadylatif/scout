"""
Unit 1 tests — member create/update validation + permission enforcement.
"""
import pytest
from rest_framework.test import APIClient

from apps.structure.models import Group, ScoutYear, Stage, Team
from apps.users.models import User, UserPermission


# ─── fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin_user(db):
    u = User.objects.create_superuser(
        username='admin_test', password='Admin@12345', full_name='أدمن', role='ADMIN'
    )
    UserPermission.objects.create(user=u, permissions={
        'members': {'view': True, 'add': True, 'edit': True, 'delete': True, 'export': True},
        'structure': {'view': True, 'add': True, 'edit': True, 'delete': True},
    })
    return u


@pytest.fixture
def limited_user(db):
    u = User.objects.create_user(
        username='limited_test', password='Leader@12345', full_name='قائد محدود', role='LEADER'
    )
    UserPermission.objects.create(user=u, permissions={
        'members': {'view': True, 'add': False, 'edit': False, 'delete': False, 'export': False},
        'structure': {'view': True, 'add': False, 'edit': False, 'delete': False},
    })
    return u


@pytest.fixture
def structure(db, admin_user):
    year = ScoutYear.objects.create(
        name='2026-2027', start_date='2026-09-01', end_date='2027-06-30', is_active=True
    )
    group = Group.objects.create(name='مجموعة الاختبار', type='SCOUT')
    stage = Stage.objects.create(name='مرحلة الكشاف', group=group, order=1)
    team = Team.objects.create(name='فريق النسور', stage=stage)
    return {'year': year, 'group': group, 'stage': stage, 'team': team}


# ─── helpers ────────────────────────────────────────────────────────────────

def auth(client, user):
    client.force_authenticate(user=user)
    return client


# ─── tests ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_member_valid(api, admin_user, structure):
    """201 + stage_code generated + QR generated."""
    auth(api, admin_user)
    payload = {
        'full_name': 'مينا جرجس كامل',
        'gender': 'M',
        'phone': '01012345678',
        'guardian_phone': '01123456789',
        'group': str(structure['group'].pk),
        'stage': str(structure['stage'].pk),
        'team': str(structure['team'].pk),
        'scout_year': str(structure['year'].pk),
    }
    res = api.post('/api/members/', payload, format='multipart')
    assert res.status_code == 201, res.data
    # Get the created member via list
    from apps.members.models import Member
    member = Member.objects.filter(full_name='مينا جرجس كامل').first()
    assert member is not None
    assert member.stage_code is not None
    assert member.stage_code.startswith('SC-')
    assert member.qr_image


@pytest.mark.django_db
def test_create_member_invalid_phone(api, admin_user, structure):
    """400 for invalid Egyptian phone number."""
    auth(api, admin_user)
    payload = {
        'full_name': 'تيست تيست',
        'gender': 'M',
        'phone': '0512345678',  # not Egyptian
        'group': str(structure['group'].pk),
        'stage': str(structure['stage'].pk),
        'team': str(structure['team'].pk),
    }
    res = api.post('/api/members/', payload, format='multipart')
    assert res.status_code == 400
    assert 'phone' in res.data or 'هاتف' in str(res.data)


@pytest.mark.django_db
def test_create_member_invalid_national_id(api, admin_user, structure):
    """400 for national_id shorter than 14 digits."""
    auth(api, admin_user)
    payload = {
        'full_name': 'تيست رقم قومي',
        'gender': 'F',
        'phone': '01012345678',
        'national_id': '123456',  # only 6 digits
        'group': str(structure['group'].pk),
        'stage': str(structure['stage'].pk),
        'team': str(structure['team'].pk),
    }
    res = api.post('/api/members/', payload, format='multipart')
    assert res.status_code == 400
    assert 'national_id' in res.data or '14' in str(res.data)


@pytest.mark.django_db
def test_create_member_no_permission(api, limited_user, structure):
    """403 for user without members.add permission."""
    auth(api, limited_user)
    payload = {
        'full_name': 'محظور الإضافة',
        'gender': 'M',
        'phone': '01012345678',
        'group': str(structure['group'].pk),
        'stage': str(structure['stage'].pk),
        'team': str(structure['team'].pk),
    }
    res = api.post('/api/members/', payload, format='multipart')
    assert res.status_code == 403


@pytest.mark.django_db
def test_delete_member_no_permission(api, limited_user, admin_user, structure):
    """403 when trying to delete without permission."""
    from apps.members.models import Member
    from apps.users.models import UserScopeAccess
    member = Member.objects.create(
        full_name='للحذف', gender='M',
        group=structure['group'], stage=structure['stage'], team=structure['team'],
    )
    # Give limited user scope access so they can see the member (but not delete)
    UserScopeAccess.objects.create(
        user=limited_user, scope_type='TEAM', scope_id=structure['team'].pk
    )
    auth(api, limited_user)
    res = api.delete(f'/api/members/{member.pk}/')
    assert res.status_code == 403


@pytest.mark.django_db
def test_stage_code_archived_on_stage_change(api, admin_user, structure):
    """Old stage_code is archived in MemberCodeHistory when member moves to a new stage."""
    from apps.members.models import Member, MemberCodeHistory
    auth(api, admin_user)

    stage2 = Stage.objects.create(name='مرحلة المتقدم', group=structure['group'], order=2)
    team2 = Team.objects.create(name='فريق الفهود', stage=stage2)

    member = Member.objects.create(
        full_name='للترقية', gender='M',
        group=structure['group'], stage=structure['stage'], team=structure['team'],
    )
    old_code = member.stage_code
    assert old_code is not None

    payload = {
        'full_name': 'للترقية',
        'gender': 'M',
        'stage': str(stage2.pk),
        'team': str(team2.pk),
    }
    res = api.patch(f'/api/members/{member.pk}/', payload, format='multipart')
    assert res.status_code == 200, res.data

    # Old code must be archived regardless of whether new code is identical
    assert MemberCodeHistory.objects.filter(member=member, old_code=old_code).exists()
    # Member must have been saved (stage changed)
    member.refresh_from_db()
    assert str(member.stage_id) == str(stage2.pk)
