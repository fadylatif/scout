from django.core.management.base import BaseCommand
from apps.structure.models import Group, GroupType, Stage, Team
from apps.structure.constants import SCOUT_STAGES_HIERARCHY


class Command(BaseCommand):
    help = 'يهيئ الهيكل الكشفي والإرشادي المعتمد لمجموعة أبي سيفين (المراحل والفرق بالترتيب العمري)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('بدء تهيئة الهيكل الكشفي الرسمي...'))

        # 1. المجموعات الرئيسية
        marine_group, _ = Group.objects.get_or_create(
            name='المجموعة البحرية',
            defaults={'type': GroupType.SCOUT, 'description': 'المجموعة الكشفية البحرية للبنين'}
        )
        guides_group, _ = Group.objects.get_or_create(
            name='مجموعة المرشدات',
            defaults={'type': GroupType.GUIDE, 'description': 'مجموعة المرشدات والزهرات للبنات'}
        )

        created_stages = 0
        created_teams = 0

        # 2. إنشاء المراحل والفرق بالترتيب من الأصغر للأكبر (1 إلى 8)
        for stage_info in SCOUT_STAGES_HIERARCHY:
            order = stage_info['order']
            stage_name = stage_info['name']
            description = stage_info['description']

            # مرحلة المجموعة البحرية
            stage_marine, s_created = Stage.objects.get_or_create(
                name=stage_name,
                group=marine_group,
                defaults={'order': order}
            )
            if s_created:
                created_stages += 1

            # مرحلة مجموعة المرشدات
            stage_guides, sg_created = Stage.objects.get_or_create(
                name=stage_name,
                group=guides_group,
                defaults={'order': order}
            )
            if sg_created:
                created_stages += 1

            # الفرق التابعة للمرحلة
            for team_info in stage_info['teams']:
                team_name = team_info['name']
                gender = team_info['gender']

                # إذا كان الفريق للأولاد فقط، ينشأ في المجموعة البحرية
                if gender in ('M', 'ANY'):
                    _, t_created = Team.objects.get_or_create(
                        name=team_name,
                        stage=stage_marine,
                        defaults={'description': description}
                    )
                    if t_created:
                        created_teams += 1

                # إذا كان الفريق للبنات فقط، ينشأ في مجموعة المرشدات
                if gender in ('F', 'ANY'):
                    _, t_created = Team.objects.get_or_create(
                        name=team_name,
                        stage=stage_guides,
                        defaults={'description': description}
                    )
                    if t_created:
                        created_teams += 1

        self.stdout.write(self.style.SUCCESS(
            f'اكتملت التهيئة بنجاح! تم إنشاء وتأكيد المراحل والفرق بالترتيب الرسمي من 1 (سنافر) إلى 8 (قادة).'
        ))
