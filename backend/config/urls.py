from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Core apps
    path('api/', include('apps.common.urls')),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.structure.urls')),
    path('api/', include('apps.members.urls')),
    path('api/attendance/', include('apps.attendance.urls')),

    # Feature apps
    path('api/activities/', include('apps.activities.urls')),
    path('api/advancement/', include('apps.advancement.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/media/', include('apps.media_center.urls')),
    path('api/reports/', include('apps.reports.urls')),

    # API Documentation (OpenAPI / Swagger)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
