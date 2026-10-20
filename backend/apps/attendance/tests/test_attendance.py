import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from apps.users.models import User, UserRole
from apps.structure.models import Group, Stage, Team
from apps.members.models import Member
from apps.attendance.models import (
    AttendanceSession, AttendanceRecord, AttendanceExcuse,
    AttendanceStatus, ExcuseStatus
)
from apps.common.models import AuditLog


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username='admin_attend',
        password='Password123!',
        full_name='Admin Attendance'
    )


@pytest.fixture
def leader_user(db):
    return User.objects.create_user(
        username='leader_attend',
        password='Password123!',
        full_name='Leader Attendance',
        role=UserRole.LEADER
    )


@pytest.fixture
def client_admin(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def setup_scout_hierarchy(db):
    group = Group.objects.create(name='مجموعة التجربة')
    stage = Stage.objects.create(name='مرحلة الفتيان', group=group, order=1)
    team = Team.objects.create(name='فريق النسور', stage=stage)

    m1 = Member.objects.create(full_name='مينا كمال', stage=stage, team=team, gender='M')
    m2 = Member.objects.create(full_name='بيشوي عاطف', stage=stage, team=team, gender='M')
    m3 = Member.objects.create(full_name='كيرلس سمير', stage=stage, team=team, gender='M')

    return {'group': group, 'stage': stage, 'team': team, 'members': [m1, m2, m3]}


@pytest.mark.django_db
def test_create_attendance_session(client_admin, setup_scout_hierarchy):
    team = setup_scout_hierarchy['team']
    payload = {
        'title': 'اجتماع الجمعة الأسبوعي',
        'date': timezone.now().isoformat(),
        'location': 'مقر المجموعة الرئيسي',
        'description': 'اجتماع تدريب وتوزيع شارات',
        'unit_id': str(team.id)
    }

    res = client_admin.post('/api/attendance/sessions/', payload, format='json')
    assert res.status_code == 201
    assert res.data['title'] == 'اجتماع الجمعة الأسبوعي'
    assert 'فريق: فريق النسور' in res.data['unit_name']

    # Audit log check
    audit = AuditLog.objects.filter(entity_type='AttendanceSession', action='CREATE').first()
    assert audit is not None


@pytest.mark.django_db
def test_populate_members_in_session(client_admin, setup_scout_hierarchy):
    team = setup_scout_hierarchy['team']
    session = AttendanceSession.objects.create(
        title='جلسة نشاط بحري',
        date=timezone.now(),
        unit_id=team.id
    )

    res = client_admin.post(f'/api/attendance/sessions/{session.id}/populate/')
    assert res.status_code == 200
    assert res.data['populated_count'] == 3

    # All records initially marked ABSENT
    records = AttendanceRecord.objects.filter(session=session)
    assert records.count() == 3
    for r in records:
        assert r.status == AttendanceStatus.ABSENT


@pytest.mark.django_db
def test_qr_checkin_success_and_duplicate_prevention(client_admin, setup_scout_hierarchy):
    team = setup_scout_hierarchy['team']
    m1 = setup_scout_hierarchy['members'][0]
    session = AttendanceSession.objects.create(
        title='طابور الصباح',
        date=timezone.now(),
        unit_id=team.id
    )

    # First Scan: Successful check-in via Member UUID
    res1 = client_admin.post('/api/attendance/qr-checkin/', {
        'session_id': str(session.id),
        'qr_data': str(m1.id)
    }, format='json')

    assert res1.status_code == 200
    assert res1.data['status'] == 'CHECKED_IN'
    assert res1.data['member']['full_name'] == 'مينا كمال'

    record = AttendanceRecord.objects.get(session=session, member=m1)
    assert record.status == AttendanceStatus.PRESENT
    assert record.check_in_time is not None

    # Second Scan: Prevent duplicate check-in (Must return ALREADY_CHECKED_IN)
    res2 = client_admin.post('/api/attendance/qr-checkin/', {
        'session_id': str(session.id),
        'qr_data': m1.stage_code  # Can also scan by stage_code!
    }, format='json')

    assert res2.status_code == 200
    assert res2.data['status'] == 'ALREADY_CHECKED_IN'
    assert 'مسجل حاضر بالفعل' in res2.data['message']


@pytest.mark.django_db
def test_excuse_submission_and_approval(client_admin, setup_scout_hierarchy):
    team = setup_scout_hierarchy['team']
    m2 = setup_scout_hierarchy['members'][1]
    session = AttendanceSession.objects.create(
        title='رحلة الخريف',
        date=timezone.now(),
        unit_id=team.id
    )

    record = AttendanceRecord.objects.create(
        session=session,
        member=m2,
        status=AttendanceStatus.ABSENT
    )

    # 1. Submit Excuse
    res_excuse = client_admin.post('/api/attendance/excuses/', {
        'record': str(record.id),
        'reason': 'ظروف سفر عائلية طارئة'
    }, format='json')
    assert res_excuse.status_code == 201
    excuse_id = res_excuse.data['id']

    excuse = AttendanceExcuse.objects.get(pk=excuse_id)
    assert excuse.status == ExcuseStatus.PENDING
    assert excuse.is_approved is False

    # 2. Approve Excuse
    res_approve = client_admin.post(f'/api/attendance/excuses/{excuse_id}/approve/')
    assert res_approve.status_code == 200

    excuse.refresh_from_db()
    record.refresh_from_db()
    assert excuse.status == ExcuseStatus.APPROVED
    assert excuse.is_approved is True
    # Auto-updated record status to EXCUSED
    assert record.status == AttendanceStatus.EXCUSED
