from django.contrib.auth import authenticate
from rest_framework import serializers

from apps.users.models import (
    PermissionTemplate,
    User,
    UserPermission,
    UserScopeAccess,
    UserSession,
)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(label='اسم المستخدم')
    password = serializers.CharField(
        label='كلمة المرور',
        style={'input_type': 'password'},
        trim_whitespace=False,
    )

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        request = self.context.get('request')

        user = authenticate(request=request, username=username, password=password)
        if not user:
            raise serializers.ValidationError(
                'اسم المستخدم أو كلمة المرور غير صحيحة.',
                code='authorization',
            )
        if not user.is_active:
            raise serializers.ValidationError(
                'هذا الحساب معطّل. تواصل مع المسؤول.',
                code='authorization',
            )
        attrs['user'] = user
        return attrs


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ['id', 'session_key', 'device_info', 'ip_address', 'created_at', 'last_activity', 'is_active']
        read_only_fields = fields


class UserPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPermission
        fields = ['id', 'permissions', 'copied_from']


class UserScopeAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserScopeAccess
        fields = ['id', 'scope_type', 'scope_id']


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email', 'phone', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    permission = UserPermissionSerializer(read_only=True)
    scope_accesses = UserScopeAccessSerializer(many=True, read_only=True)
    sessions = UserSessionSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email', 'phone', 'role',
            'is_active', 'is_staff', 'last_login_ip', 'date_joined',
            'permission', 'scope_accesses', 'sessions',
        ]
        read_only_fields = ['id', 'last_login_ip', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, label='كلمة المرور')
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=PermissionTemplate.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        label='قالب الصلاحيات',
    )

    class Meta:
        model = User
        fields = ['username', 'full_name', 'email', 'phone', 'role', 'password', 'template_id']

    def create(self, validated_data):
        template = validated_data.pop('template_id', None)
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        # Copy permissions from template if provided
        perms = template.permissions if template else {}
        UserPermission.objects.create(
            user=user,
            permissions=perms,
            copied_from=template,
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'email', 'phone', 'role', 'is_active']


class PermissionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionTemplate
        fields = ['id', 'name', 'description', 'permissions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class MeSerializer(serializers.ModelSerializer):
    permission = UserPermissionSerializer(read_only=True)
    scope_accesses = UserScopeAccessSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email', 'phone', 'role',
            'is_active', 'is_staff', 'date_joined', 'permission', 'scope_accesses',
        ]
        read_only_fields = fields
