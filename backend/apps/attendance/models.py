from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel
from apps.members.models import Member

class AttendanceStatus(models.TextChoices):
    PRESENT = 'PRESENT', 'حاضر'
    ABSENT = 'ABSENT', 'غائب'
    EXCUSED = 'EXCUSED', 'بعذر'
    LATE = 'LATE', 'متأخر'

class AttendanceSession(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    يمثل جلسة حضور محددة (اجتماع، نشاط، رحلة)
    """
    title = models.CharField(max_length=255, verbose_name="عنوان الجلسة")
    date = models.DateTimeField(verbose_name="التاريخ والوقت")
    location = models.CharField(max_length=255, blank=True, null=True, verbose_name="الموقع")
    description = models.TextField(blank=True, verbose_name="وصف النشاط")

    # Linking to structure (Optional: can be specific to a stage, team, or the whole group)
    # I will use a GenericForeignKey or a simple UUID field since StructureUnit might be complex
    unit_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="معرف الوحدة التنظيمية"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_attendance_sessions',
        verbose_name="منشئ الجلسة"
    )

    class Meta:
        verbose_name = "جلسة حضور"
        verbose_name_plural = "جلسات الحضور"
        ordering = ['-date']

    def __str__(self):
        return f"{self.title} - {self.date.strftime('%Y-%m-%d')}"

class AttendanceRecord(BaseUUIDModel, SoftDeleteModel):
    """
    سجل حضور فرد معين في جلسة محددة
    """
    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='records',
        verbose_name="الجلسة"
    )
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        verbose_name="الفرد"
    )
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.ABSENT,
        verbose_name="الحالة"
    )
    check_in_time = models.DateTimeField(null=True, blank=True, verbose_name="وقت تسجيل الحضور")
    notes = models.TextField(blank=True, verbose_name="ملاحظات")

    class Meta:
        verbose_name = "سجل حضور"
        verbose_name_plural = "سجلات الحضور"
        unique_together = ('session', 'member')

    def __str__(self):
        return f"{self.member} - {self.session} ({self.get_status_display()})"

class AttendanceExcuse(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    إدارة الأعذار المقدمة للغياب
    """
    record = models.OneToOneField(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='excuse',
        verbose_name="سجل الحضور"
    )
    reason = models.TextField(verbose_name="سبب العذر")
    document = models.FileField(
        upload_to='excuses/',
        null=True,
        blank=True,
        verbose_name="مستند العذر"
    )
    is_approved = models.BooleanField(default=False, verbose_name="هل تم الاعتماد؟")
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_excuses',
        verbose_name="معتمد بواسطة"
    )
    approval_date = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الاعتماد")

    class Meta:
        verbose_name = "عذر غياب"
        verbose_name_plural = "أعذار الغياب"

    def __str__(self):
        return f"عذر {self.record.member} - {self.record.session}"
