from django.contrib import admin

from apps.members.models import CustomField, CustomFieldValue, Member, MemberCodeHistory, MemberTransferLog


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'stage_code', 'gender', 'team', 'stage', 'is_active']
    list_filter = ['gender', 'is_active', 'group', 'stage', 'team']
    search_fields = ['full_name', 'stage_code', 'phone']
    readonly_fields = ['id', 'stage_code', 'qr_image', 'created_at', 'updated_at']


@admin.register(MemberCodeHistory)
class MemberCodeHistoryAdmin(admin.ModelAdmin):
    list_display = ['member', 'old_code', 'stage', 'changed_at']
    readonly_fields = ['changed_at']


@admin.register(MemberTransferLog)
class MemberTransferLogAdmin(admin.ModelAdmin):
    list_display = ['member', 'from_team', 'to_team', 'transferred_at', 'transferred_by']
    readonly_fields = ['transferred_at']


@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    list_display = ['name', 'field_type', 'group', 'required']
    list_filter = ['field_type', 'group']


@admin.register(CustomFieldValue)
class CustomFieldValueAdmin(admin.ModelAdmin):
    list_display = ['member', 'custom_field', 'value']
    search_fields = ['member__full_name']
