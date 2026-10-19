from rest_framework.permissions import BasePermission

from apps.users.models import UserRole


class IsAdminUser(BasePermission):
    """Only ADMIN role users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsAdminOrReadOnly(BasePermission):
    """ADMIN can write; others read-only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == UserRole.ADMIN


class BaseScopedPermission(BasePermission):
    """
    Base permission that checks user is authenticated.
    Subclasses can override has_object_permission to enforce scope rules.
    Admins bypass all scope checks.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def is_admin(self, request):
        return request.user.role == UserRole.ADMIN

    def get_user_scope_ids(self, request, scope_type):
        """Return set of UUIDs the user has access to for a given scope_type."""
        return set(
            request.user.scope_accesses
            .filter(scope_type=scope_type)
            .values_list('scope_id', flat=True)
        )
