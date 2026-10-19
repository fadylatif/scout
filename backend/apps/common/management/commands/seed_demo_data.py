import random
from django.core.management.base import BaseCommand
from apps.users.models import User, PermissionTemplate
from apps.structure.models import Group, Stage, Team, Patrol
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = 'Seeds the database with demo data'

    def handle(self, *args, **options):
        # Create Demo User
        if not User.objects.filter(username='scout_admin').exists():
            User.objects.create(
                username='scout_admin',
                full_name='مسؤول النظام',
                role='ADMIN',
                password=make_password('Password123!'),
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS('Created admin user: scout_admin'))

        # Create Demo Groups/Structure
        group, _ = Group.objects.get_or_create(name='المجموعة البحرية')
        stage, _ = Stage.objects.get_or_create(name='مرحلة الكشاف', group=group, order=1)
        team, _ = Team.objects.get_or_create(name='فريق النسور', stage=stage)
        Patrol.objects.get_or_create(name='رهط الصقور', team=team)

        self.stdout.write(self.style.SUCCESS('Demo structure created.'))
