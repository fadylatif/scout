from django.conf import settings
from django.db import models

from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel


class ScoutYear(BaseUUIDModel, TimeStampedModel):
    name = models.CharField(max_length=100, unique=True, verbose_name='اسم السنة')
    start_date = models.DateField(verbose_name='تاريخ البداية')
    end_date = models.DateField(verbose_name='تاريخ النهاية')
    is_active = models.BooleanField(default=False, verbose_name='نشطة؟', db_index=True)

    class Meta:
        verbose_name = 'سنة كشفية'
        verbose_name_plural = 'السنوات الكشفية'
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_active:
            ScoutYear.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class GroupType(models.TextChoices):
    SCOUT = 'SCOUT', 'كشفية'
    GUIDE = 'GUIDE', 'إرشادية'
    NAVAL = 'NAVAL', 'بحرية'


class Group(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=255, verbose_name='اسم المجموعة')
    type = models.CharField(
        max_length=10,
        choices=GroupType.choices,
        default=GroupType.SCOUT,
        verbose_name='نوع المجموعة',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')

    class Meta:
        verbose_name = 'مجموعة'
        verbose_name_plural = 'المجموعات'

    def __str__(self):
        return self.name


class Sector(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=255, verbose_name='اسم القطاع')
    group = models.ForeignKey(
        Group,
        on_delete=models.PROTECT,
        related_name='sectors',
        verbose_name='المجموعة',
    )

    class Meta:
        verbose_name = 'قطاع'
        verbose_name_plural = 'القطاعات'

    def __str__(self):
        return self.name


class Stage(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=255, verbose_name='اسم المرحلة')
    group = models.ForeignKey(
        Group,
        on_delete=models.PROTECT,
        related_name='stages',
        verbose_name='المجموعة',
    )
    order = models.PositiveIntegerField(default=0, verbose_name='الترتيب')

    class Meta:
        verbose_name = 'مرحلة'
        verbose_name_plural = 'المراحل'
        ordering = ['order']

    def __str__(self):
        return self.name


class Team(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=255, verbose_name='اسم الفريق')
    stage = models.ForeignKey(
        Stage,
        on_delete=models.PROTECT,
        related_name='teams',
        verbose_name='المرحلة',
    )
    sector = models.ForeignKey(
        Sector,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='teams',
        verbose_name='القطاع',
    )
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='led_teams',
        verbose_name='القائد',
    )
    description = models.TextField(blank=True, verbose_name='الوصف')

    class Meta:
        verbose_name = 'فريق'
        verbose_name_plural = 'الفرق'

    def __str__(self):
        return self.name


class Patrol(BaseUUIDModel, TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=255, verbose_name='اسم الطابور')
    team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name='patrols',
        verbose_name='الفريق',
    )
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='led_patrols',
        verbose_name='القائد',
    )

    class Meta:
        verbose_name = 'طابور'
        verbose_name_plural = 'الطوابير'

    def __str__(self):
        return self.name
