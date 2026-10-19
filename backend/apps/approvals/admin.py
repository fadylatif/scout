from django.contrib import admin
from .models import ApprovalRequest, ApprovalAction

class ApprovalActionInline(admin.TabularInline):
    model = ApprovalAction
    extra = 0
    readonly_fields = ('action_by', 'decision', 'comment', 'created_at')

@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ('requester', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('requester__full_name', 'reason')
    inlines = [ApprovalActionInline]
    ordering = ('-created_at',)

@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    list_display = ('request', 'action_by', 'decision', 'created_at')
    list_filter = ('decision',)
    search_fields = ('comment',)
