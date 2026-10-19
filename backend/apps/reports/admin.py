from django.contrib import admin
from .models import ReportTemplate, ReportLog

@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'report_type', 'is_system_default')
    list_filter = ('report_type', 'is_system_default')
    search_fields = ('name', 'description')

@admin.register(ReportLog)
class ReportLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'template', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('user__full_name', 'parameters')
    readonly_fields = ('created_at',)
