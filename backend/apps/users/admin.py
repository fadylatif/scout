from django.contrib import admin

from apps.users.models import PermissionTemplate, User, UserPermission, UserScopeAccess, UserSession


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'full_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'email']
    ordering = ['full_name']
    readonly_fields = ['date_joined', 'last_login_ip', 'id']


@admin.register(PermissionTemplate)
class PermissionTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'copied_from']
    search_fields = ['user__username']


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'is_active', 'created_at', 'last_activity']
    list_filter = ['is_active']
    search_fields = ['user__username', 'ip_address']
    readonly_fields = ['session_key', 'created_at', 'last_activity']


@admin.register(UserScopeAccess)
class UserScopeAccessAdmin(admin.ModelAdmin):
    list_display = ['user', 'scope_type', 'scope_id']
    list_filter = ['scope_type']
    search_fields = ['user__username']
