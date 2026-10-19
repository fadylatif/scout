from django.db import models
from django.conf import settings
from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel

class MediaAlbum(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    """
    ألبوم صور أو فيديوهات لنشاط معين
    """
    title = models.CharField(max_length=255, verbose_name="عنوان الألبوم")
    description = models.TextField(blank=True, verbose_name="الوصف")
    cover_image = models.ImageField(upload_to='media_center/covers/', null=True, blank=True, verbose_name="صورة الغلاف")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_albums',
        verbose_name="منشئ الألبوم"
    )
    # Linking to an activity if available
    activity_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="معرف النشاط المرتبط"
    )

    class Meta:
        verbose_name = "ألبوم ميديا"
        verbose_name_plural = "ألبومات الميديا"
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class MediaFile(BaseUUIDModel, TimeStampedModel):
    """
    ملف ميديا فردي (صورة أو فيديو)
    """
    album = models.ForeignKey(
        MediaAlbum,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name="الألبوم"
    )
    file = models.FileField(upload_to='media_center/files/', verbose_name="الملف")
    file_type = models.CharField(
        max_length=20,
        choices=[('IMAGE', 'صورة'), ('VIDEO', 'فيديو'), ('DOC', 'مستند')],
        verbose_name="نوع الملف"
    )
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name="حجم الملف (بايت)")
    original_name = models.CharField(max_length=255, verbose_name="الاسم الأصلي")

    # Chunked upload tracking
    upload_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="معرف الرفع المجزأ")
    chunks_received = models.PositiveIntegerField(default=0, verbose_name="عدد الأجزاء المستلمة")
    is_complete = models.BooleanField(default=False, verbose_name="هل اكتمل الرفع؟")

    class Meta:
        verbose_name = "ملف ميديا"
        verbose_name_plural = "ملفات الميديا"

    def __str__(self):
        return f"{self.original_name} ({self.file_type})"
