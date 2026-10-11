import sys
from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = ['*']

# In development, disable strict SSL requirements
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Enable browsable API in dev
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [  # noqa: F405
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]

# Disable axes lockout in automated tests
if 'pytest' in sys.modules:
    AXES_ENABLED = False
