from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel

class ActivityType(models.TextChoices):
    MEETING = 'MEETING', 'اجتماع دوري'
    CAMP = 'CAMP', 'مخيم'
    TRIP = 'TRIP', 'رحلة'
    EVENT = 'EVENT', 'حدث عام'
    TRAINING = 'TRAINING', 'تدريب'

class RecurrenceFrequency(models.TextChoices):
    DAILY = 'DAILY', 'يومي'
    WEEKLY = 'WEEKLY', 'أسبوعي'
    MONTHLY = 'MONTHLY', 'شهري'
    YEARLY = 'YEARLY', 'سنوي'

class ActivityLocation(BaseUUIDModel, TimeStampedModel):
    """
    سجل المواقع المتزامنة
    """
    name = models.CharField(max_length=255, verbose_name="اسم الموقع")
    address = models.TextField(blank=True, null=True, verbose_name="العنوان")
    coordinates = models.CharField(max_length=100, blank=True, null=True, verbose_name="إحداثيات GPS")
    is_default = models.BooleanField(default=False, verbose_name="الموقع الافتراضي؟")

    class Meta:
        verbose_name = "موقع نشاط"
        verbose_name_plural = "مواقع الأنشطة"

    def __str__(self):
        return self.name

class Activity(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    النشاط الأساسي أو القاعدة للأنشطة المتكررة
    """
    title = models.CharField(max_length=255, verbose_name="عنوان النشاط")
    description = models.TextField(blank=True, verbose_name="الوصف")
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices,
        default=ActivityType.MEETING,
        verbose_name="نوع النشاط"
    )
    location = models.ForeignKey(
        ActivityLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities',
        verbose_name="الموقع"
    )

    # Recurrence Settings
    is_recurring = models.BooleanField(default=False, verbose_name="هل هو نشاط متكرر؟")
    frequency = models.CharField(
        max_length=20,
        choices=RecurrenceFrequency.choices,
        null=True,
        blank=True,
        verbose_name="تكرار النشاط"
    )
    recurrence_day = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="يوم التكرار (1-7)"
    )
    start_date = models.DateTimeField(verbose_name="تاريخ البدء")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الانتهاء")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_activities',
        verbose_name="منشئ النشاط"
    )

    class Meta:
        verbose_name = "نشاط"
        verbose_name_plural = "الأنشطة"
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.title} ({self.get_activity_type_display()})"

class ActivityInstance(BaseUUIDModel, TimeStampedModel):
    """
    نسخة فعلية من النشاط (إما نشاط فردي أو نسخة من نشاط متكرر)
    """
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name='instances',
        verbose_name="النشاط الأساسي"
    )
    start_time = models.DateTimeField(verbose_name="وقت البدء")
    end_time = models.DateTimeField(verbose_name="وقت الانتهاء")
    is_cancelled = models.BooleanField(default=False, verbose_name="ملغى؟")
    notes = models.TextField(blank=True, verbose_name="ملاحظات خاصة بهذه النسخة")

    class Meta:
        verbose_name = "نسخة نشاط"
        verbose_name_plural = "نسخ الأنشطة"

    def __str__(self):
        return f"{self.activity.title} - {self.start_time.strftime('%Y-%m-%d')}"
