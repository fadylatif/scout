from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApprovalRequestViewSet

router = DefaultRouter()
router.register(r'requests', ApprovalRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
