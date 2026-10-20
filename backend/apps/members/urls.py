from django.urls import path

from apps.members import views

app_name = 'members'

urlpatterns = [
    # Members CRUD
    path('members/', views.MemberListCreateView.as_view(), name='member-list'),
    path('members/<uuid:pk>/', views.MemberDetailView.as_view(), name='member-detail'),
    path('members/<uuid:pk>/transfer/', views.MemberTransferView.as_view(), name='member-transfer'),

    # Excel Import / Export
    path('members/export/excel/', views.MemberExportExcelView.as_view(), name='member-export-excel'),
    path('members/import/template/', views.MemberImportTemplateView.as_view(), name='member-import-template'),
    path('members/import/preview/', views.MemberImportPreviewView.as_view(), name='member-import-preview'),
    path('members/import/confirm/', views.MemberImportConfirmView.as_view(), name='member-import-confirm'),
    path('members/import/errors/', views.MemberImportErrorsDownloadView.as_view(), name='member-import-errors-download'),

    # Custom Fields
    path('custom-fields/', views.CustomFieldListCreateView.as_view(), name='custom-field-list'),
    path('custom-fields/<uuid:pk>/', views.CustomFieldDetailView.as_view(), name='custom-field-detail'),
]
