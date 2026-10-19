from django.contrib import admin
from .models import Activity, ActivityInstance, ActivityLocation

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('title', 'activity_type', 'start_date', 'is_recurring')
    list_filter = ('activity_type', 'is_recurring', 'location')
    search_fields = ('title', 'description')

@admin.register(ActivityInstance)
class ActivityInstanceAdmin(admin.ModelAdmin):
    list_display = ('activity', 'start_time', 'end_time', 'is_cancelled')
    list_filter = ('is_cancelled', 'activity__activity_type')
    search_fields = ('activity__title',)

@admin.register(ActivityLocation)
class ActivityLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_default')
    search_fields = ('name', 'address')
