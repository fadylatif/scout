from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel
from apps.members.models import Member

class Badge(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    شارة كشفية أو رتبة (مثلاً: كشاف مبتدئ، شارة التخييم)
    """
    name = models.CharField(max_length=255, verbose_name="اسم الشارة")
    description = models.TextField(blank=True, verbose_name="الوصف")
    icon = models.ImageField(upload_to='badges/', null=True, blank=True, verbose_name="أيقونة الشارة")
    category = models.CharField(max_length=100, blank=True, null=True, verbose_name="الفئة")
    is_rank = models.BooleanField(default=False, verbose_name="هل هي رتبة أساسية؟")

    class Meta:
        verbose_name = "شارة"
        verbose_name_plural = "الشارات"

    def __str__(self):
        return self.name

class Requirement(BaseUUIDModel, TimeStampedModel):
    """
    متطلب محدد للحصول على الشارة (مثلاً: حفظ الوعد، إشعال نار)
    """
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name='requirements',
        verbose_name="الشارة التابعة لها"
    )
    title = models.CharField(max_length=255, verbose_name="عنوان المتطلب")
    description = models.TextField(blank=True, verbose_name="تفاصيل المتطلب")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب")
    is_mandatory = models.BooleanField(default=True, verbose_name="إلزامي؟")

    class Meta:
        verbose_name = "متطلب"
        verbose_name_plural = "المتطلبات"
        ordering = ['order']

    def __str__(self):
        return f"{self.badge.name} -> {self.title}"

class AdvancementRecord(BaseUUIDModel, TimeStampedModel):
    """
    سجل إنجاز فرد لمتطلب معين
    """
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='advancements',
        verbose_name="الفرد"
    )
    requirement = models.ForeignKey(
        Requirement,
        on_delete=models.CASCADE,
        related_name='member_records',
        verbose_name="المتطلب"
    )
    is_completed = models.BooleanField(default=False, verbose_name="تم الإنجاز؟")
    completion_date = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الإنجاز")
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluated_advancements',
        verbose_name="القائد المُقيم"
    )
    notes = models.TextField(blank=True, verbose_name="ملاحظات التقييم")

    class Meta:
        verbose_name = "سجل تقدم"
        verbose_name_plural = "سجلات التقدم"
        unique_together = ('member', 'requirement')

    def __str__(self):
        return f"{self.member} - {self.requirement.title} ({'تم' if self.is_completed else 'قيد التنفيذ'})"
