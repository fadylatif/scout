from django.contrib.auth import login, logout
from django.contrib.sessions.models import Session
from rest_framework import generics, status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.common.models import AuditLog
from apps.users.models import (
    PermissionTemplate,
    User,
    UserSession,
)
from apps.users.permissions import IsAdminUser
from apps.users.serializers import (
    LoginSerializer,
    MeSerializer,
    PermissionTemplateSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserSessionSerializer,
    UserUpdateSerializer,
)


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _get_device_info(request):
    return request.META.get('HTTP_USER_AGENT', '')[:500]


class LoginView(views.APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Check session limit (MAX 2 active sessions for non-admin leaders)
        from django.conf import settings
        max_sessions = getattr(settings, 'MAX_LEADER_SESSIONS', 2)
        active_count = UserSession.objects.filter(user=user, is_active=True).count()
        if active_count >= max_sessions and user.role != 'ADMIN':
            return Response(
                {
                    'detail': f'وصلت للحد الأقصى من الجلسات النشطة ({max_sessions}). '
                              'أنهِ إحدى جلساتك الحالية أولاً.',
                    'code': 'session_limit_exceeded',
                    'active_sessions': active_count,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        from django.middleware.csrf import get_token
        get_token(request)

        ip = _get_client_ip(request)
        device = _get_device_info(request)

        # Store user session record
        UserSession.objects.create(
            user=user,
            session_key=request.session.session_key,
            ip_address=ip or None,
            device_info=device,
        )

        # Update last login IP
        User.objects.filter(pk=user.pk).update(last_login_ip=ip or None)

        # Audit log
        AuditLog.objects.create(
            action='LOGIN',
            user=user,
            entity_type='User',
            entity_id=str(user.pk),
            description=str(user),
            ip_address=ip or None,
        )

        return Response(MeSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_key = request.session.session_key
        if session_key:
            UserSession.objects.filter(session_key=session_key).update(is_active=False)

        AuditLog.objects.create(
            action='LOGOUT',
            user=request.user,
            entity_type='User',
            entity_id=str(request.user.pk),
            description=str(request.user),
            ip_address=_get_client_ip(request) or None,
        )

        logout(request)
        return Response({'detail': 'تم تسجيل الخروج بنجاح.'}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class SessionListView(generics.ListAPIView):
    """List current user's active sessions."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user, is_active=True).order_by('-created_at')


class SessionDeleteView(views.APIView):
    """Terminate a session by ID (own sessions or admin for any)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        qs = UserSession.objects.filter(id=session_id, is_active=True)
        if request.user.role != 'ADMIN':
            qs = qs.filter(user=request.user)

        session_obj = qs.first()
        if not session_obj:
            return Response({'detail': 'الجلسة غير موجودة أو غير مصرح لك.'}, status=status.HTTP_404_NOT_FOUND)

        # Expire the Django session
        try:
            Session.objects.filter(session_key=session_obj.session_key).delete()
        except Exception:
            pass
        session_obj.is_active = False
        session_obj.save(update_fields=['is_active'])

        return Response({'detail': 'تم إنهاء الجلسة بنجاح.'}, status=status.HTTP_200_OK)


class AllSessionsView(generics.ListAPIView):
    """Admin only — list all active sessions."""
    permission_classes = [IsAdminUser]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        return UserSession.objects.filter(is_active=True).select_related('user').order_by('-created_at')


# ─── User CRUD (Admin only) ────────────────────────────────────────────────

class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_active=True).order_by('full_name')
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'email']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserDetailSerializer

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        AuditLog.objects.create(
            action='DELETE',
            user=self.request.user,
            entity_type='User',
            entity_id=str(instance.pk),
            description=str(instance),
            ip_address=_get_client_ip(self.request) or None,
        )

class UserResetPasswordView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'المستخدم غير موجود.'}, status=status.HTTP_404_NOT_FOUND)

        password = request.data.get('password')
        if not password:
            return Response({'detail': 'يجب تحديد كلمة المرور الجديدة.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        AuditLog.objects.create(
            action='UPDATE', user=request.user, entity_type='User',
            entity_id=str(user.pk), description=f'Reset password for {user}',
            ip_address=_get_client_ip(request) or None,
        )
        return Response({'detail': 'تم تغيير كلمة المرور بنجاح.'})


# ─── Permission Templates ──────────────────────────────────────────────────

class PermissionTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = PermissionTemplate.objects.all().order_by('name')
    serializer_class = PermissionTemplateSerializer


class PermissionTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = PermissionTemplate.objects.all()
    serializer_class = PermissionTemplateSerializer
