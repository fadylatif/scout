from django.contrib import admin
from .models import MediaAlbum, MediaFile

class MediaFileInline(admin.TabularInline):
    model = MediaFile
    extra = 0
    readonly_fields = ('file_size', 'original_name')

@admin.register(MediaAlbum)
class MediaAlbumAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'description')
    inlines = [MediaFileInline]

@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'album', 'file_type', 'file_size', 'is_complete')
    list_filter = ('file_type', 'is_complete')
    search_fields = ('original_name',)
