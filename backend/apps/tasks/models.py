from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel

class TaskPriority(models.TextChoices):
    LOW = 'LOW', 'منخفضة'
    MEDIUM = 'MEDIUM', 'متوسطة'
    HIGH = 'HIGH', 'عالية'
    URGENT = 'URGENT', 'عاجلة جداً'

class TaskStatus(models.TextChoices):
    TODO = 'TODO', 'قيد الانتظار'
    IN_PROGRESS = 'IN_PROGRESS', 'قيد التنفيذ'
    REVIEW = 'REVIEW', 'في المراجعة'
    DONE = 'DONE', 'مكتمل'
    CANCELLED = 'CANCELLED', 'ملغى'

class Task(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    مهمة إدارية أو ميدانية موكلة للقيادة
    """
    title = models.CharField(max_length=255, verbose_name="عنوان المهمة")
    description = models.TextField(blank=True, verbose_name="الوصف")
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        verbose_name="الأولوية"
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
        verbose_name="الحالة"
    )
    deadline = models.DateTimeField(null=True, blank=True, verbose_name="الموعد النهائي")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks',
        verbose_name="منشئ المهمة"
    )

    class Meta:
        verbose_name = "مهمة"
        verbose_name_plural = "المهام"
        ordering = ['-priority', '-deadline']

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

class TaskAssignment(BaseUUIDModel, TimeStampedModel):
    """
    تخصيص المهمة لمستخدم أو أكثر
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="المهمة"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        verbose_name="المستخدم المسؤول"
    )
    is_primary = models.BooleanField(default=False, verbose_name="المسؤول الرئيسي؟")

    class Meta:
        verbose_name = "تخصيص مهمة"
        verbose_name_plural = "تخصيصات المهام"
        unique_together = ('task', 'user')

    def __str__(self):
        return f"{self.user} -> {self.task}"

class TaskComment(BaseUUIDModel, TimeStampedModel):
    """
    ملاحظات وتحديثات حول المهمة
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name="المهمة"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_comments',
        verbose_name="الكاتب"
    )
    text = models.TextField(verbose_name="نص الملاحظة")

    class Meta:
        verbose_name = "تعليق على مهمة"
        verbose_name_plural = "تعليقات المهام"
        ordering = ['created_at']

    def __str__(self):
        return f"تعليق {self.user} على {self.task}"
