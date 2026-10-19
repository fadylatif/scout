from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord, AttendanceExcuse, AttendanceStatus

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'location', 'created_by')
    list_filter = ('date', 'created_by')
    search_fields = ('title', 'description')
    ordering = ('-date',)

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('member', 'session', 'status', 'check_in_time')
    list_filter = ('status', 'session__date')
    search_fields = ('member__full_name', 'session__title')
    raw_id_fields = ('member', 'session')

@admin.register(AttendanceExcuse)
class AttendanceExcuseAdmin(admin.ModelAdmin):
    list_display = ('record', 'is_approved', 'approved_by', 'approval_date')
    list_filter = ('is_approved',)
    search_fields = ('reason',)
    raw_id_fields = ('record', 'approved_by')
