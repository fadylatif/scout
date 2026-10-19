from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BadgeViewSet, RequirementViewSet, AdvancementViewSet

router = DefaultRouter()
router.register(r'badges', BadgeViewSet)
router.register(r'requirements', RequirementViewSet)
router.register(r'records', AdvancementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
