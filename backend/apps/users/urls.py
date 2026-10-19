from django.urls import path

from apps.users import views

app_name = 'users'

urlpatterns = [
    # Auth
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.MeView.as_view(), name='me'),

    # Sessions
    path('auth/sessions/', views.SessionListView.as_view(), name='sessions-list'),
    path('auth/sessions/<uuid:session_id>/delete/', views.SessionDeleteView.as_view(), name='session-delete'),
    path('admin/sessions/', views.AllSessionsView.as_view(), name='admin-sessions'),

    # Users CRUD
    path('users/', views.UserListCreateView.as_view(), name='user-list'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<uuid:pk>/reset-password/', views.UserResetPasswordView.as_view(), name='user-reset-password'),

    # Permission Templates
    path('permission-templates/', views.PermissionTemplateListCreateView.as_view(), name='template-list'),
    path('permission-templates/<uuid:pk>/', views.PermissionTemplateDetailView.as_view(), name='template-detail'),
]
