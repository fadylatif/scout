from django.urls import path
from .views import HealthCheckView, SmokeTestView, SampleQRExportView, SampleExcelExportView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('smoke-test/', SmokeTestView.as_view(), name='smoke-test'),
    path('smoke-test/qr/', SampleQRExportView.as_view(), name='smoke-qr'),
    path('smoke-test/excel/', SampleExcelExportView.as_view(), name='smoke-excel'),
]
