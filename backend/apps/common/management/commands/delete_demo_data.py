from django.core.management.base import BaseCommand
from apps.users.models import User, PermissionTemplate
from apps.structure.models import Group, Stage, Team, Patrol
from apps.members.models import Member

class Command(BaseCommand):
    help = 'Deletes all demo data'

    def handle(self, *args, **options):
        self.stdout.write('Deleting demo data...')

        # Delete structure (cascades or protected check)
        Patrol.objects.all().hard_delete()
        Team.objects.all().hard_delete()
        Stage.objects.all().hard_delete()
        Group.objects.all().hard_delete()

        # Delete users (except maybe protected ones)
        # We can delete users created by seed
        User.objects.exclude(username='scout_admin_prod').hard_delete()
        PermissionTemplate.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('All demo data deleted successfully!'))
