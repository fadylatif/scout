from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceSessionViewSet,
    AttendanceRecordViewSet,
    AttendanceExcuseViewSet,
    QRCheckInView
)

router = DefaultRouter()
router.register(r'sessions', AttendanceSessionViewSet)
router.register(r'records', AttendanceRecordViewSet)
router.register(r'excuses', AttendanceExcuseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('qr-checkin/', QRCheckInView.as_view(), name='qr_checkin'),
]
