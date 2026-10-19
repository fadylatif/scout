from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.users.models import User, PermissionTemplate
from apps.structure.models import Group, Stage, Team, Patrol

class Command(BaseCommand):
    help = 'Creates comprehensive demo data including users, teams, stages, patrols, and permission templates'

    def handle(self, *args, **options):
        self.stdout.write('Creating demo data...')

        # ─── Create Groups ────────────────────────────────────────────────────────
        groups_data = [
            {'name': 'Marine Group', 'description': 'Marine Scouts Group'},
            {'name': 'Guides Group', 'description': 'Guides Group'},
            {'name': 'Air Group', 'description': 'Air Group'},
        ]

        group_objects = {}
        for g_data in groups_data:
            group, created = Group.objects.get_or_create(
                name=g_data['name'],
                defaults={'description': g_data.get('description', '')}
            )
            group_objects[g_data['name']] = group
            if created:
                self.stdout.write(f'Created group: {group.name}')

        # ─── Create Stages ───────────────────────────────────────────────────────
        stages_data = []
        for group_name, group_obj in group_objects.items():
            stages_data.extend([
                {'name': 'Scout Stage', 'order': 1, 'group': group_obj},
                {'name': 'Advanced Stage', 'order': 2, 'group': group_obj},
                {'name': 'Elite Stage', 'order': 3, 'group': group_obj},
            ])

        stage_objects = {}
        for s_data in stages_data:
            stage, created = Stage.objects.get_or_create(
                name=s_data['name'],
                group=s_data['group'],
                order=s_data['order']
            )
            stage_objects[s_data['name']] = stage
            if created:
                self.stdout.write(f'Created stage: {stage.name}')

        # ─── Create Teams ────────────────────────────────────────────────────────
        teams_data = []
        for stage_name, stage_obj in stage_objects.items():
            teams_data.extend([
                {'name': 'Eagles Team', 'stage': stage_obj},
                {'name': 'Lions Team', 'stage': stage_obj},
                {'name': 'Falcons Team', 'stage': stage_obj},
                {'name': 'Wolves Team', 'stage': stage_obj},
            ])

        team_objects = {}
        for t_data in teams_data:
            team, created = Team.objects.get_or_create(
                name=t_data['name'],
                stage=t_data['stage']
            )
            team_objects[t_data['name']] = team
            if created:
                self.stdout.write(f'Created team: {team.name}')

        # ─── Create Patrols ───────────────────────────────────────────────────────
        patrols_data = []
        for team_name, team_obj in team_objects.items():
            patrols_data.extend([
                {'name': 'Eagles Patrol', 'team': team_obj},
                {'name': 'Lions Patrol', 'team': team_obj},
                {'name': 'Falcons Patrol', 'team': team_obj},
                {'name': 'Wolves Patrol', 'team': team_obj},
            ])

        for p_data in patrols_data:
            patrol, created = Patrol.objects.get_or_create(
                name=p_data['name'],
                team=p_data['team']
            )
            if created:
                self.stdout.write(f'Created patrol: {patrol.name}')

        # ─── Create Permission Templates ─────────────────────────────────────────
        templates_data = [
            {
                'name': 'Stage Leader',
                'description': 'Stage Leader permissions',
                'permissions': {'members': {'view': True, 'add': True, 'edit': True, 'delete': True}}
            },
            {
                'name': 'Team Leader',
                'description': 'Team Leader permissions',
                'permissions': {'members': {'view': True, 'add': True, 'edit': True, 'delete': False}}
            },
            {
                'name': 'Viewer Only',
                'description': 'View only access',
                'permissions': {'members': {'view': True, 'add': False, 'edit': False, 'delete': False}}
            },
        ]

        for tmpl_data in templates_data:
            template, created = PermissionTemplate.objects.get_or_create(
                name=tmpl_data['name'],
                defaults={
                    'description': tmpl_data['description'],
                    'permissions': tmpl_data['permissions']
                }
            )
            if created:
                self.stdout.write(f'Created template: {template.name}')

        # ─── Create Users ────────────────────────────────────────────────────────
        users_data = [
            {
                'username': 'scout_admin',
                'full_name': 'System Admin',
                'role': 'ADMIN',
                'email': 'admin@scouts.eg',
                'phone': '01000000000',
                'is_active': True,
            },
            {
                'username': 'leader_general',
                'full_name': 'General Leader',
                'role': 'LEADER',
                'email': 'leader@scouts.eg',
                'phone': '01000000001',
                'is_active': True,
            },
        ]

        for u_data in users_data:
            user, created = User.objects.get_or_create(
                username=u_data['username'],
                defaults={
                    'full_name': u_data['full_name'],
                    'role': u_data['role'],
                    'email': u_data.get('email', ''),
                    'phone': u_data.get('phone', ''),
                    'is_active': u_data.get('is_active'),
                }
            )
            if created:
                user.set_password('Password123!')
                user.save()
                self.stdout.write(f'Created user: {user.username}')

        self.stdout.write(self.style.SUCCESS('Demo data created successfully!'))
