from django.contrib import admin

from apps.structure.models import Group, Patrol, Sector, Stage, ScoutYear, Team


@admin.register(ScoutYear)
class ScoutYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'type']
    list_filter = ['type']
    search_fields = ['name']


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'group']
    list_filter = ['group']
    search_fields = ['name']


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ['name', 'group', 'order']
    list_filter = ['group']
    ordering = ['order']


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'stage', 'sector', 'leader']
    list_filter = ['stage', 'sector']
    search_fields = ['name']


@admin.register(Patrol)
class PatrolAdmin(admin.ModelAdmin):
    list_display = ['name', 'team', 'leader']
    list_filter = ['team']
    search_fields = ['name']
