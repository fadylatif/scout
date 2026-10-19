from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel

class ReportTemplate(BaseUUIDModel, TimeStampedModel):
    """
    قالب تقرير مخصص (يحدد الحقول والفلترة)
    """
    name = models.CharField(max_length=255, verbose_name="اسم القالب")
    description = models.TextField(blank=True, verbose_name="الوصف")
    report_type = models.CharField(
        max_length=50,
        choices=[('MEMBERS', 'قائمة أفراد'), ('ATTENDANCE', 'تقرير حضور'), ('ADVANCEMENT', 'سجل تقدم')],
        verbose_name="نوع التقرير"
    )
    config = models.JSONField(
        default=dict,
        verbose_name="إعدادات التقرير (الحقول المختارة)"
    )
    is_system_default = models.BooleanField(default=False, verbose_name="قالب افتراضي")

    class Meta:
        verbose_name = "قالب تقرير"
        verbose_name_plural = "قوالب التقارير"

    def __str__(self):
        return self.name

class ReportLog(BaseUUIDModel, TimeStampedModel):
    """
    سجل عمليات توليد التقارير (للأرشفة والتدقيق)
    """
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="القالب المستخدم"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="من قام بتوليد التقرير"
    )
    parameters = models.JSONField(default=dict, verbose_name="المعايير المستخدمة")
    generated_file_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="مسار الملف المولد"
    )

    class Meta:
        verbose_name = "سجل التقارير"
        verbose_name_plural = "سجلات التقارير"

    def __str__(self):
        return f"تقرير {self.template} بواسطة {self.user}"
