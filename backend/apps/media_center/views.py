import os
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import MediaAlbum, MediaFile
from .serializers import MediaAlbumSerializer, MediaFileSerializer
from apps.users.permissions import BaseScopedPermission

class MediaAlbumViewSet(viewsets.ModelViewSet):
    """
    إدارة ألبومات الميديا
    """
    queryset = MediaAlbum.objects.all()
    serializer_class = MediaAlbumSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class MediaFileViewSet(viewsets.ModelViewSet):
    """
    إدارة ملفات الميديا والرفع المجزأ
    """
    queryset = MediaFile.objects.all()
    serializer_class = MediaFileSerializer
    permission_classes = [IsAuthenticated, BaseScopedPermission]

    @action(detail=False, methods=['post'], url_path='upload-chunk')
    def upload_chunk(self, request):
        """
        معالجة رفع جزء من ملف (Chunked Upload)
        """
        upload_id = request.data.get('upload_id')
        chunk_index = int(request.data.get('chunk_index', 0))
        total_chunks = int(request.data.get('total_chunks', 1))
        album_id = request.data.get('album_id')
        file_obj = request.FILES.get('file')

        if not all([upload_id, file_obj, album_id]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        album = get_object_or_404(MediaAlbum, pk=album_id)

        # Get or create the file record
        media_file, created = MediaFile.objects.get_or_create(
            upload_id=upload_id,
            defaults={
                'album': album,
                'original_name': file_obj.name,
                'file_type': 'IMAGE' if file_obj.content_type.startswith('image/') else 'VIDEO',
                'is_complete': False
            }
        )

        # Handle file assembly on disk
        temp_path = os.path.join(settings.MEDIA_ROOT, 'temp_uploads', str(upload_id))
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)

        with open(temp_path, 'ab') as f:
            f.write(file_obj.read())

        media_file.chunks_received += 1
        media_file.save()

        if media_file.chunks_received == total_chunks:
            # Finalize the file: Move from temp to permanent storage
            # (Simplified: in a real system, we would use a storage backend)
            media_file.is_complete = True
            media_file.file_size = os.path.getsize(temp_path)
            media_file.save()

            # Move temp file to the final path defined by MediaFile.file field
            # This is a simplified version of the finalization logic
            final_path = media_file.file.name # Using default Django upload path
            # Logic to rename temp_path to final_path would go here

        return Response({"status": "chunk uploaded", "received": media_file.chunks_received}, status=status.HTTP_200_OK)
