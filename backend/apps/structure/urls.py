from django.urls import path

from apps.structure import views

app_name = 'structure'

urlpatterns = [
    # Scout Years
    path('scout-years/', views.ScoutYearListCreateView.as_view(), name='scout-year-list'),
    path('scout-years/<uuid:pk>/', views.ScoutYearDetailView.as_view(), name='scout-year-detail'),

    # Groups
    path('groups/', views.GroupListCreateView.as_view(), name='group-list'),
    path('groups/<uuid:pk>/', views.GroupDetailView.as_view(), name='group-detail'),
    path('groups/tree/', views.GroupTreeView.as_view(), name='group-tree'),

    # Sectors
    path('sectors/', views.SectorListCreateView.as_view(), name='sector-list'),
    path('sectors/<uuid:pk>/', views.SectorDetailView.as_view(), name='sector-detail'),

    # Stages
    path('stages/', views.StageListCreateView.as_view(), name='stage-list'),
    path('stages/<uuid:pk>/', views.StageDetailView.as_view(), name='stage-detail'),

    # Teams
    path('teams/', views.TeamListCreateView.as_view(), name='team-list'),
    path('teams/<uuid:pk>/', views.TeamDetailView.as_view(), name='team-detail'),

    # Patrols
    path('patrols/', views.PatrolListCreateView.as_view(), name='patrol-list'),
    path('patrols/<uuid:pk>/', views.PatrolDetailView.as_view(), name='patrol-detail'),
]
