from django.contrib import admin
from .models import Task, TaskAssignment, TaskComment

class TaskAssignmentInline(admin.TabularInline):
    model = TaskAssignment
    extra = 1

class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 1

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'priority', 'status', 'deadline', 'created_by')
    list_filter = ('priority', 'status', 'deadline')
    search_fields = ('title', 'description')
    inlines = [TaskAssignmentInline, TaskCommentInline]
    ordering = ('-priority', '-deadline')

@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'is_primary')
    list_filter = ('is_primary',)
    search_fields = ('task__title', 'user__full_name')

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'created_at')
    list_filter = ('user', 'task__status')
    search_fields = ('text',)
