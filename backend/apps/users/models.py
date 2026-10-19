from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'مدير النظام'
    LEADER = 'LEADER', 'قائد'
    ASSISTANT = 'ASSISTANT', 'مساعد قائد'


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('يجب تحديد اسم المستخدم')
        extra_fields.setdefault('is_active', True)
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, BaseUUIDModel, SoftDeleteModel):
    username = models.CharField(max_length=150, unique=True, verbose_name='اسم المستخدم')
    full_name = models.CharField(max_length=255, verbose_name='الاسم الكامل')
    email = models.EmailField(blank=True, verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الهاتف')
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.LEADER,
        verbose_name='الدور',
    )
    is_active = models.BooleanField(default=True, verbose_name='نشط؟')
    is_staff = models.BooleanField(default=False, verbose_name='موظف نظام؟')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='آخر عنوان IP')
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الانضمام')

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'

    def __str__(self):
        return f'{self.username} ({self.full_name})'

    def has_perm(self, perm, obj=None):
        return self.is_staff or self.role == UserRole.ADMIN

    def has_module_perms(self, app_label):
        return self.is_staff or self.role == UserRole.ADMIN


class PermissionTemplate(BaseUUIDModel, TimeStampedModel):
    name = models.CharField(max_length=255, unique=True, verbose_name='اسم القالب')
    permissions = models.JSONField(default=dict, verbose_name='الصلاحيات')
    description = models.TextField(blank=True, verbose_name='الوصف')

    class Meta:
        verbose_name = 'قالب صلاحيات'
        verbose_name_plural = 'قوالب الصلاحيات'

    def __str__(self):
        return self.name


class UserPermission(BaseUUIDModel, TimeStampedModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='permission',
        verbose_name='المستخدم',
    )
    permissions = models.JSONField(default=dict, verbose_name='الصلاحيات')
    copied_from = models.ForeignKey(
        PermissionTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='user_permissions',
        verbose_name='منسوخ من قالب',
    )

    class Meta:
        verbose_name = 'صلاحيات مستخدم'
        verbose_name_plural = 'صلاحيات المستخدمين'

    def __str__(self):
        return f'صلاحيات {self.user.username}'


class UserSession(BaseUUIDModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name='المستخدم',
    )
    session_key = models.CharField(max_length=40, unique=True, verbose_name='مفتاح الجلسة')
    device_info = models.TextField(blank=True, verbose_name='معلومات الجهاز')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='عنوان IP')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    last_activity = models.DateTimeField(auto_now=True, verbose_name='آخر نشاط')
    is_active = models.BooleanField(default=True, verbose_name='نشطة؟')

    class Meta:
        verbose_name = 'جلسة مستخدم'
        verbose_name_plural = 'جلسات المستخدمين'

    def __str__(self):
        return f'جلسة {self.user.username} - {self.session_key[:8]}'


class ScopeType(models.TextChoices):
    GROUP = 'GROUP', 'مجموعة'
    STAGE = 'STAGE', 'مرحلة'
    TEAM = 'TEAM', 'فريق'
    PATROL = 'PATROL', 'طابور'


class UserScopeAccess(BaseUUIDModel, TimeStampedModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='scope_accesses',
        verbose_name='المستخدم',
    )
    scope_type = models.CharField(
        max_length=20,
        choices=ScopeType.choices,
        verbose_name='نوع النطاق',
    )
    scope_id = models.UUIDField(verbose_name='معرف النطاق')

    class Meta:
        verbose_name = 'نطاق صلاحية مستخدم'
        verbose_name_plural = 'نطاقات صلاحيات المستخدمين'
        unique_together = [('user', 'scope_type', 'scope_id')]

    def __str__(self):
        return f'{self.user.username} → {self.scope_type}:{self.scope_id}'
