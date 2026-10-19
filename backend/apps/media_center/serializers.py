from rest_framework import serializers
from .models import MediaAlbum, MediaFile

class MediaFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaFile
        fields = '__all__'
        read_only_fields = ['file_size']

class MediaAlbumSerializer(serializers.ModelSerializer):
    files = MediaFileSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = MediaAlbum
        fields = '__all__'
        read_only_fields = ['created_by']
