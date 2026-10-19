from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel

class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'قيد الانتظار'
    APPROVED = 'APPROVED', 'معتمد'
    REJECTED = 'REJECTED', 'مرفوض'
    INFO_REQUESTED = 'INFO_REQUESTED', 'طلب معلومات إضافية'

class ApprovalRequest(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    طلب اعتماد عام يمكن أن يرتبط بأي كيان في النظام (عذر، شارة، مصروفات، إلخ)
    """
    # Generic Foreign Key to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, verbose_name="نوع الكيان")
    object_id = models.CharField(max_length=255, db_index=True, verbose_name="معرف الكيان")
    content_object = GenericForeignKey('content_type', 'object_id')

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_approvals',
        verbose_name="مقدم الطلب"
    )

    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        verbose_name="حالة الطلب"
    )

    priority = models.CharField(
        max_length=20,
        choices=[('LOW', 'منخفضة'), ('MEDIUM', 'متوسطة'), ('HIGH', 'عالية')],
        default='MEDIUM',
        verbose_name="الأولوية"
    )

    reason = models.TextField(blank=True, verbose_name="سبب الطلب / المبررات")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "طلب اعتماد"
        verbose_name_plural = "طلبات الاعتماد"
        ordering = ['-created_at']

    def __str__(self):
        return f"طلب {self.get_status_display()} من {self.requester} - {self.content_type}"

class ApprovalAction(BaseUUIDModel, TimeStampedModel):
    """
    سجل القرارات المتخذة على الطلب
    """
    request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.CASCADE,
        related_name='actions',
        verbose_name="الطلب"
    )
    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='approval_actions',
        verbose_name="القائد الذي اتخذ القرار"
    )
    decision = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        verbose_name="القرار"
    )
    comment = models.TextField(blank=True, verbose_name="ملاحظات القرار")

    class Meta:
        verbose_name = "إجراء اعتماد"
        verbose_name_plural = "إجراءات الاعتماد"

    def __str__(self):
        return f"قرار {self.decision} بواسطة {self.action_by} لطلب {self.request}"
