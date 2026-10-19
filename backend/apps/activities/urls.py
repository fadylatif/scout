from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet, ActivityInstanceViewSet, ActivityLocationViewSet

router = DefaultRouter()
router.register(r'activities', ActivityViewSet)
router.register(r'instances', ActivityInstanceViewSet)
router.register(r'locations', ActivityLocationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
