"""Tests for apps.users — Authentication, session limits, permission templates, and user management."""
import pytest
from rest_framework.test import APIClient

from apps.common.models import AuditLog
from apps.users.models import PermissionTemplate, User, UserPermission, UserSession


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin_user(db):
    u = User.objects.create_superuser(
        username='admin_test',
        password='AdminPassword123!',
        full_name='مدير النظام',
        role='ADMIN',
    )
    UserPermission.objects.create(
        user=u,
        permissions={'all': True},
    )
    return u


@pytest.fixture
def leader_user(db):
    u = User.objects.create_user(
        username='leader_test',
        password='LeaderPassword123!',
        full_name='قائد الكشافة',
        role='LEADER',
    )
    UserPermission.objects.create(
        user=u,
        permissions={'members': {'view': True, 'add': True}},
    )
    return u


def test_login_success(api, leader_user):
    res = api.post('/api/auth/login/', {'username': 'leader_test', 'password': 'LeaderPassword123!'}, format='json')
    assert res.status_code == 200
    data = res.json()
    assert data['username'] == 'leader_test'
    assert data['full_name'] == 'قائد الكشافة'
    assert UserSession.objects.filter(user=leader_user, is_active=True).count() == 1
    assert AuditLog.objects.filter(action='LOGIN', user=leader_user).exists()


def test_login_wrong_password(api, leader_user):
    res = api.post('/api/auth/login/', {'username': 'leader_test', 'password': 'WrongPassword'}, format='json')
    assert res.status_code == 400
    assert 'non_field_errors' in res.json() or 'detail' in res.json()


def test_session_limit_rejected(api, leader_user):
    # Create 2 existing active sessions
    UserSession.objects.create(user=leader_user, session_key='sess-1', is_active=True)
    UserSession.objects.create(user=leader_user, session_key='sess-2', is_active=True)

    # 3rd login attempt should be rejected
    res = api.post('/api/auth/login/', {'username': 'leader_test', 'password': 'LeaderPassword123!'}, format='json')
    assert res.status_code == 403
    assert res.json().get('code') == 'session_limit_exceeded'


def test_admin_bypasses_session_limit(api, admin_user):
    # Admin can have more than 2 sessions
    UserSession.objects.create(user=admin_user, session_key='admin-sess-1', is_active=True)
    UserSession.objects.create(user=admin_user, session_key='admin-sess-2', is_active=True)

    res = api.post('/api/auth/login/', {'username': 'admin_test', 'password': 'AdminPassword123!'}, format='json')
    assert res.status_code == 200


def test_logout_clears_session(api, leader_user):
    api.force_authenticate(user=leader_user)
    # Simulate an active session
    session = api.session
    session.save()
    UserSession.objects.create(user=leader_user, session_key=session.session_key, is_active=True)

    res = api.post('/api/auth/logout/')
    assert res.status_code == 200
    sess = UserSession.objects.get(session_key=session.session_key)
    assert sess.is_active is False
    assert AuditLog.objects.filter(action='LOGOUT', user=leader_user).exists()


def test_me_authenticated(api, leader_user):
    api.force_authenticate(user=leader_user)
    res = api.get('/api/auth/me/')
    assert res.status_code == 200
    assert res.json()['username'] == 'leader_test'


def test_me_unauthenticated(api):
    res = api.get('/api/auth/me/')
    assert res.status_code == 403


def test_user_crud_admin_only(api, admin_user, leader_user):
    # Leader cannot list users
    api.force_authenticate(user=leader_user)
    res = api.get('/api/users/')
    assert res.status_code == 403

    # Admin can list users
    api.force_authenticate(user=admin_user)
    res = api.get('/api/users/')
    assert res.status_code == 200


def test_permission_template_independence(db):
    tmpl = PermissionTemplate.objects.create(
        name='قالب القائد المساعد',
        permissions={'members': {'view': True, 'add': True, 'edit': False}},
    )

    u = User.objects.create_user(
        username='assistant_1',
        password='Pass@123456',
        full_name='مساعد قائد',
        role='ASSISTANT',
    )
    # Assign from template (deep copy)
    up = UserPermission.objects.create(
        user=u,
        permissions=dict(tmpl.permissions),
        copied_from=tmpl,
    )

    # Now mutate template
    tmpl.permissions = {'members': {'view': True, 'add': True, 'edit': True, 'delete': True}}
    tmpl.save()

    # User permissions remain independent and unchanged
    up.refresh_from_db()
    assert up.permissions == {'members': {'view': True, 'add': True, 'edit': False}}
