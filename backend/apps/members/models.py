from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models

from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel
from apps.common.services.qr import generate_qr_png_bytes


class Member(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    class Gender(models.TextChoices):
        MALE = 'M', 'ذكر'
        FEMALE = 'F', 'أنثى'

    full_name = models.CharField(max_length=255, verbose_name='الاسم الكامل')
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='تاريخ الميلاد')
    gender = models.CharField(
        max_length=1,
        choices=Gender.choices,
        verbose_name='الجنس',
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='رقم الهاتف')
    guardian_phone = models.CharField(max_length=20, blank=True, verbose_name='رقم هاتف ولي الأمر')
    address = models.TextField(blank=True, verbose_name='العنوان')
    national_id_encrypted = models.TextField(blank=True, verbose_name='الرقم القومي مشفر')
    photo = models.ImageField(
        upload_to='members/photos/',
        null=True,
        blank=True,
        verbose_name='الصورة الشخصية',
    )
    group = models.ForeignKey(
        'structure.Group',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        verbose_name='المجموعة',
    )
    stage = models.ForeignKey(
        'structure.Stage',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        verbose_name='المرحلة',
    )
    team = models.ForeignKey(
        'structure.Team',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        verbose_name='الفريق',
    )
    patrol = models.ForeignKey(
        'structure.Patrol',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        verbose_name='الطابور',
    )
    scout_year = models.ForeignKey(
        'structure.ScoutYear',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        verbose_name='السنة الكشفية',
    )
    stage_code = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='كود المرحلة',
    )
    qr_image = models.ImageField(
        upload_to='members/qr/',
        null=True,
        blank=True,
        verbose_name='صورة QR',
    )
    is_active = models.BooleanField(default=True, db_index=True, verbose_name='نشط؟')

    class Meta:
        verbose_name = 'فرد'
        verbose_name_plural = 'الأفراد'

    def __str__(self):
        return f'{self.full_name} ({self.stage_code or str(self.id)[:8]})'

    def generate_stage_code(self):
        """Produces SC-{year_last2}-{group_initial}-{seq:03d}."""
        year_part = '00'
        if self.scout_year_id:
            from apps.structure.models import ScoutYear
            try:
                year = ScoutYear.objects.get(pk=self.scout_year_id)
                year_part = str(year.start_date.year)[-2:]
            except ScoutYear.DoesNotExist:
                pass

        group_initial = 'X'
        if self.group_id:
            from apps.structure.models import Group
            try:
                group = Group.all_objects.get(pk=self.group_id)
                group_initial = (group.name[0] if group.name else 'X').upper()
            except Group.DoesNotExist:
                pass

        # Count existing members with same stage + year + group
        qs = Member.all_objects.filter(
            stage_id=self.stage_id,
            scout_year_id=self.scout_year_id,
            group_id=self.group_id,
        )
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        seq = qs.count() + 1
        self.stage_code = f'SC-{year_part}-{group_initial}-{seq:03d}'

    def generate_qr(self):
        """Generates QR code PNG and saves to qr_image."""
        png_bytes = generate_qr_png_bytes(str(self.id))
        file_name = f'qr_{self.id}.png'
        self.qr_image.save(file_name, ContentFile(png_bytes), save=False)

    def save(self, *args, **kwargs):
        if not self.stage_code:
            self.generate_stage_code()
        if not self.qr_image:
            self.generate_qr()
        super().save(*args, **kwargs)


class MemberCodeHistory(BaseUUIDModel):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='code_history',
        verbose_name='الفرد',
    )
    old_code = models.CharField(max_length=30, verbose_name='الكود القديم')
    stage = models.ForeignKey(
        'structure.Stage',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='المرحلة',
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ التغيير')
    reason = models.TextField(blank=True, verbose_name='السبب')

    class Meta:
        verbose_name = 'سجل كود الفرد'
        verbose_name_plural = 'سجلات كودات الأفراد'

    def __str__(self):
        return f'{self.member} - {self.old_code}'


class CustomFieldType(models.TextChoices):
    TEXT = 'TEXT', 'نص'
    NUMBER = 'NUMBER', 'رقم'
    DATE = 'DATE', 'تاريخ'
    BOOLEAN = 'BOOLEAN', 'نعم/لا'
    SELECT = 'SELECT', 'اختيار'


class CustomField(BaseUUIDModel, TimeStampedModel):
    name = models.CharField(max_length=255, verbose_name='اسم الحقل')
    field_type = models.CharField(
        max_length=10,
        choices=CustomFieldType.choices,
        verbose_name='نوع الحقل',
    )
    group = models.ForeignKey(
        'structure.Group',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='custom_fields',
        verbose_name='المجموعة',
    )
    required = models.BooleanField(default=False, verbose_name='مطلوب؟')
    options = models.JSONField(default=list, verbose_name='الخيارات')

    class Meta:
        verbose_name = 'حقل مخصص'
        verbose_name_plural = 'الحقول المخصصة'

    def __str__(self):
        return self.name


class CustomFieldValue(BaseUUIDModel):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='custom_values',
        verbose_name='الفرد',
    )
    custom_field = models.ForeignKey(
        CustomField,
        on_delete=models.CASCADE,
        related_name='values',
        verbose_name='الحقل المخصص',
    )
    value = models.TextField(blank=True, verbose_name='القيمة')

    class Meta:
        verbose_name = 'قيمة حقل مخصص'
        verbose_name_plural = 'قيم الحقول المخصصة'
        unique_together = [('member', 'custom_field')]

    def __str__(self):
        return f'{self.member} - {self.custom_field}: {self.value}'


class MemberTransferLog(BaseUUIDModel):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='transfer_logs',
        verbose_name='الفرد',
    )
    from_team = models.ForeignKey(
        'structure.Team',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='الفريق السابق',
    )
    to_team = models.ForeignKey(
        'structure.Team',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='الفريق الجديد',
    )
    from_stage = models.ForeignKey(
        'structure.Stage',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='المرحلة السابقة',
    )
    to_stage = models.ForeignKey(
        'structure.Stage',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='المرحلة الجديدة',
    )
    transferred_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ النقل')
    reason = models.TextField(blank=True, verbose_name='السبب')
    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='نُفِّذ بواسطة',
    )

    class Meta:
        verbose_name = 'سجل نقل فرد'
        verbose_name_plural = 'سجلات نقل الأفراد'

    def __str__(self):
        return f'نقل {self.member} في {self.transferred_at}'
