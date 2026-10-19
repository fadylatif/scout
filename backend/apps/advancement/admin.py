from django.contrib import admin
from .models import Badge, Requirement, AdvancementRecord

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'is_rank')
    list_filter = ('category', 'is_rank')
    search_fields = ('name', 'description')

class RequirementInline(admin.TabularInline):
    model = Requirement
    extra = 1

@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ('title', 'badge', 'order', 'is_mandatory')
    list_filter = ('badge', 'is_mandatory')
    search_fields = ('title', 'description')

@admin.register(AdvancementRecord)
class AdvancementRecordAdmin(admin.ModelAdmin):
    list_display = ('member', 'requirement', 'is_completed', 'completion_date', 'evaluated_by')
    list_filter = ('is_completed', 'completion_date')
    search_fields = ('member__full_name', 'requirement__title')
    raw_id_fields = ('member', 'requirement', 'evaluated_by')
