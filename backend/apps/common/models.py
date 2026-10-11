import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class BaseUUIDModel(models.Model):
    """Abstract model providing a UUID primary key for secure URL references and no IDOR."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

class TimeStampedModel(models.Model):
    """Abstract model providing created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء", db_index=True)
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاريخ آخر تعديل")

    class Meta:
        abstract = True

class SoftDeleteQuerySet(models.QuerySet):
    def delete(self, user=None):
        return self.update(is_deleted=True, deleted_at=timezone.now(), deleted_by=user)

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=True)

class SoftDeleteModel(models.Model):
    """Abstract model providing soft-delete functionality with restore capabilities."""
    is_deleted = models.BooleanField(default=False, verbose_name="محذوف؟", db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الحذف")
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_deleted",
        verbose_name="تم الحذف بواسطة"
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False, user=None):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(using=using)

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save()

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'إضافة'
    UPDATE = 'UPDATE', 'تعديل'
    DELETE = 'DELETE', 'حذف منطقي'
    RESTORE = 'RESTORE', 'استرجاع'
    IMPORT = 'IMPORT', 'استيراد'
    EXPORT = 'EXPORT', 'تصدير'
    DOWNLOAD = 'DOWNLOAD', 'تنزيل ملف'
    APPROVE = 'APPROVE', 'اعتماد'
    REJECT = 'REJECT', 'رفض'
    LOGIN = 'LOGIN', 'تسجيل دخول'
    LOGOUT = 'LOGOUT', 'تسجيل خروج'
    FAILED_LOGIN = 'FAILED_LOGIN', 'محاولة دخول فاشلة'

class AuditLog(BaseUUIDModel):
    """
    سجل التدقيق المركزي: يسجل الإضافة والتعديل والحذف والاستيراد والتصدير والتنزيل والاعتماد
    مع القيمة القديمة والجديدة وهوية الفاعل وIP والتاريخ.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
        verbose_name="المستخدم"
    )
    action = models.CharField(
        max_length=30,
        choices=AuditAction.choices,
        db_index=True,
        verbose_name="نوع الإجراء"
    )
    entity_type = models.CharField(max_length=100, db_index=True, verbose_name="نوع الكيان")
    entity_id = models.CharField(max_length=100, null=True, blank=True, db_index=True, verbose_name="معرف الكيان")
    description = models.TextField(blank=True, verbose_name="تفاصيل الإجراء")
    old_values = models.JSONField(null=True, blank=True, verbose_name="القيم السابقة")
    new_values = models.JSONField(null=True, blank=True, verbose_name="القيم الجديدة")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="عنوان IP")
    user_agent = models.TextField(blank=True, verbose_name="متصفح / جهاز المستخدم")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="تاريخ ووقت الإجراء")

    class Meta:
        verbose_name = "سجل التدقيق"
        verbose_name_plural = "سجلات التدقيق"
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.username if self.user else "نظام / مجهول"
        return f"{self.get_action_display()} - {self.entity_type} ({user_str}) @ {self.created_at}"
