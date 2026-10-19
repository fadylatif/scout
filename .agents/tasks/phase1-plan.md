# خطة تنفيذ المرحلة 1 — نظام إدارة مجموعات أبي سيفين الكشفية والإرشادية

## نتائج الاستكشاف

- **المشروع الحالي:** Phase 0 مكتمل — `apps/common` يحتوي على BaseUUIDModel, TimeStampedModel, SoftDeleteModel, AuditLog مع migrations مطبقة.
- **بيئة الاختبار:** pytest مع `DJANGO_SETTINGS_MODULE=config.settings.dev`، يُشغَّل من `d:\scout system` بـ `.venv\Scripts\pytest.exe`.
- **الـ Frontend:** React 18 + Vite + TypeScript + Tailwind (tokens.css موجود)، كل الألوان عبر CSS custom properties. shadcn Radix مثبت. **zustand غير مثبت** ← يُضاف بخطوة `npm install`.
- **المتطلبات:** `react-router-dom`, `recharts`, `axios`, `@tanstack/react-query`, `zod`, `react-hook-form` جميعها موجودة. **zustand** الوحيد الناقص.
- **نمط الـ UI الموجود:** Button/Badge/Input يستخدمون `cva` + CSS vars من tokens.css. الاتجاه RTL مضبوط في tokens.css على `html { direction: rtl }`.
- **نمط الـ Backend:** SoftDelete + BaseUUID + TimeStamped كـ mixins جاهزة. AuditLog موجود. Session auth مع django-axes.

---

## ترتيب التنفيذ

```
(1) apps/users — النماذج + migrations + serializers + views + urls + tests
(2) apps/structure — النماذج + migrations + serializers + views + urls + tests
(3) apps/members — النماذج + migrations + serializers + views + urls + tests
(4) تحديث settings/base.py + urls.py
(5) Frontend — install zustand, types, api layer, store, hooks, components, pages, router
```

---

## الخطة التفصيلية

---

### ✅ الخطوة 1 — إنشاء `apps/users` (النماذج)

**ما يجب فعله:** إنشاء تطبيق Django جديد `apps/users` بهيكله الكامل مع 5 نماذج.

**الملفات المطلوب إنشاؤها:**

#### `backend/apps/users/__init__.py` — فارغ

#### `backend/apps/users/apps.py`
```python
from django.apps import AppConfig
class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
    verbose_name = 'المستخدمون والصلاحيات'
```

#### `backend/apps/users/models.py`
خمسة نماذج بالترتيب التالي:

**1. `User(AbstractBaseUser, BaseUUIDModel, SoftDeleteModel)`**
- حقول: `username` (unique, max_length=150), `full_name` (max_length=200), `email` (blank=True), `phone` (max_length=20, blank=True), `role` (choices: ADMIN/LEADER/ASSISTANT, default=LEADER), `is_active` (default=True), `is_staff` (default=False), `last_login_ip` (GenericIPAddressField, null=True), `date_joined` (auto_now_add=True)
- `USERNAME_FIELD = 'username'`
- `REQUIRED_FIELDS = ['full_name']`
- `objects = UserManager()` — مانجر مخصص يرث `BaseUserManager`, يُعرِّف `create_user` و`create_superuser`
- `class Meta: verbose_name = 'مستخدم'`

**2. `PermissionTemplate(BaseUUIDModel, TimeStampedModel)`**
- حقول: `name` (max_length=100, unique=True), `permissions` (JSONField, default=dict), `description` (TextField, blank=True)

**3. `UserPermission(BaseUUIDModel, TimeStampedModel)`**
- حقول: `user` (OneToOneField→User, related_name='permission'), `permissions` (JSONField, default=dict), `copied_from` (FK→PermissionTemplate, null=True, on_delete=SET_NULL)
- منطق: عند إنشاء مستخدم جديد من قالب، تُنسخ `permissions` القالب هنا ثم تستقل تماماً.

**4. `UserSession(BaseUUIDModel)`**
- حقول: `user` (FK→User, related_name='sessions'), `session_key` (CharField max_length=40, unique=True), `device_info` (TextField, blank=True), `ip_address` (GenericIPAddressField, null=True), `created_at` (auto_now_add=True), `last_activity` (DateTimeField, auto_now=True), `is_active` (BooleanField, default=True)
- `class Meta: ordering = ['-last_activity']`

**5. `UserScopeAccess(BaseUUIDModel, TimeStampedModel)`**
- حقول: `user` (FK→User, related_name='scope_accesses'), `scope_type` (choices: GROUP/STAGE/TEAM/PATROL), `scope_id` (UUIDField) — يُخزن id الكيان المرتبط بدون FK مباشر (generic relation pattern بسيط)
- `class Meta: unique_together = [('user', 'scope_type', 'scope_id')]`

**الملفات:**
- `backend/apps/users/__init__.py`
- `backend/apps/users/apps.py`
- `backend/apps/users/models.py`
- `backend/apps/users/migrations/__init__.py`

**التحقق:**
```powershell
# لا يُشغَّل الاختبار بعد — فقط تحقق من الاستيراد
cd "d:\scout system"
.venv\Scripts\python.exe -c "import django; import os; os.environ['DJANGO_SETTINGS_MODULE']='config.settings.dev'; django.setup(); from apps.users.models import User, PermissionTemplate, UserPermission, UserSession, UserScopeAccess; print('users models OK')"
```

---

### ✅ الخطوة 2 — تحديث `settings/base.py` + `AUTH_USER_MODEL`

**ما يجب فعله:** إضافة التطبيقات الثلاثة إلى INSTALLED_APPS وتعيين AUTH_USER_MODEL.

**الملف:** `backend/config/settings/base.py`

التعديلات:
```python
# في LOCAL_APPS أضف:
LOCAL_APPS = [
    'apps.common',
    'apps.users',
    'apps.structure',
    'apps.members',
]

# أضف هذا السطر (بعد DEFAULT_AUTO_FIELD):
AUTH_USER_MODEL = 'users.User'
```

**ملاحظة مهمة:** `SoftDeleteModel` في `apps/common/models.py` يستخدم `settings.AUTH_USER_MODEL` لحقل `deleted_by`. بعد تعيين AUTH_USER_MODEL، يجب أن تُنشأ migration للـ common تُحدِّث هذا الـ FK. لكن في الواقع هذا يحدث تلقائياً عبر `makemigrations` — لا حاجة لتعديل يدوي.

**التحقق:**
```powershell
.venv\Scripts\python.exe backend\manage.py check --deploy 2>&1 | Select-String -NotMatch "WARN"
```

---

### ✅ الخطوة 3 — إنشاء `apps/structure` (النماذج)

**ما يجب فعله:** إنشاء تطبيق `apps/structure` بست نماذج للهيكل التنظيمي.

#### `backend/apps/structure/models.py`

**1. `ScoutYear(BaseUUIDModel, TimeStampedModel)`**
- حقول: `name` (CharField max_length=100), `start_date` (DateField), `end_date` (DateField), `is_active` (BooleanField, default=False, db_index=True)
- منطق: عند تفعيل سنة تُلغى باقي السنوات عبر `save()` override
- `class Meta: ordering = ['-start_date']`

**2. `Group(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- حقول: `name` (CharField max_length=200), `type` (choices: SCOUT/GUIDE/NAVAL), `description` (TextField, blank=True)
- `class Meta: ordering = ['name']`

**3. `Sector(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- حقول: `name` (CharField max_length=200), `group` (FK→Group, related_name='sectors', on_delete=PROTECT)

**4. `Stage(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- حقول: `name` (CharField max_length=200), `group` (FK→Group, related_name='stages', on_delete=PROTECT), `order` (PositiveIntegerField, default=0)
- `class Meta: ordering = ['order']`

**5. `Team(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- حقول: `name` (CharField max_length=200), `stage` (FK→Stage, related_name='teams', on_delete=PROTECT), `sector` (FK→Sector, null=True, blank=True, on_delete=SET_NULL), `leader` (FK→settings.AUTH_USER_MODEL, null=True, blank=True, related_name='led_teams', on_delete=SET_NULL), `description` (TextField, blank=True)

**6. `Patrol(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- حقول: `name` (CharField max_length=200), `team` (FK→Team, related_name='patrols', on_delete=PROTECT), `leader` (FK→settings.AUTH_USER_MODEL, null=True, blank=True, related_name='led_patrols', on_delete=SET_NULL)

**الملفات:**
- `backend/apps/structure/__init__.py`
- `backend/apps/structure/apps.py` (name='apps.structure', verbose_name='الهيكل التنظيمي')
- `backend/apps/structure/models.py`
- `backend/apps/structure/migrations/__init__.py`

---

### ✅ الخطوة 4 — إنشاء `apps/members` (النماذج)

**ما يجب فعله:** إنشاء `apps/members` بخمسة نماذج.

#### `backend/apps/members/models.py`

**1. `Member(BaseUUIDModel, TimeStampedModel, SoftDeleteModel)`**
- الـ `id` المورث من BaseUUIDModel هو `permanent_id` الثابت (لا تُغيّر الـ pk)
- حقول: `full_name`, `date_of_birth` (DateField, null=True), `gender` (choices: M/F), `phone` (blank=True), `guardian_phone` (blank=True), `address` (TextField, blank=True), `national_id_encrypted` (TextField, blank=True — تُخزَّن قيمة مشفرة بـ Fernet من `apps.common.services.crypto`), `photo` (ImageField, upload_to='members/photos/', null=True, blank=True), `group` (FK→structure.Group, null=True, on_delete=SET_NULL), `stage` (FK→structure.Stage, null=True, on_delete=SET_NULL), `team` (FK→structure.Team, null=True, on_delete=SET_NULL), `patrol` (FK→structure.Patrol, null=True, on_delete=SET_NULL), `scout_year` (FK→structure.ScoutYear, null=True, on_delete=SET_NULL), `stage_code` (CharField max_length=30, blank=True, unique=True, null=True, db_index=True), `qr_image` (ImageField, upload_to='members/qr/', null=True, blank=True), `is_active` (BooleanField, default=True, db_index=True)
- دالة `generate_stage_code(self)`: تولّد `SC-{year_last2}-{group_initial}-{seq:03d}` — year_last2 من `scout_year.start_date.year % 100`، group_initial أول حرف من اسم المجموعة بالإنجليزية أو رقم تسلسلي.
- دالة `generate_qr(self)`: تستدعي `generate_qr_png_bytes(str(self.id))` وتحفظ الـ PNG في `qr_image` عبر `ContentFile`.
- override `save()`: إذا لم يكن هناك `stage_code` يستدعي `generate_stage_code()`. إذا لم يكن هناك `qr_image` يستدعي `generate_qr()`.
- `class Meta: ordering = ['full_name']`

**2. `MemberCodeHistory(BaseUUIDModel)`**
- حقول: `member` (FK→Member, related_name='code_history'), `old_code` (CharField max_length=30), `stage` (FK→structure.Stage, null=True, on_delete=SET_NULL), `changed_at` (DateTimeField, auto_now_add=True), `reason` (TextField, blank=True)

**3. `CustomField(BaseUUIDModel, TimeStampedModel)`**
- حقول: `name` (CharField max_length=200), `field_type` (choices: TEXT/NUMBER/DATE/BOOLEAN/SELECT), `group` (FK→structure.Group, null=True, blank=True, on_delete=SET_NULL), `required` (BooleanField, default=False), `options` (JSONField, default=list — للـ SELECT)

**4. `CustomFieldValue(BaseUUIDModel)`**
- حقول: `member` (FK→Member, related_name='custom_values'), `custom_field` (FK→CustomField, on_delete=CASCADE), `value` (TextField, blank=True)
- `class Meta: unique_together = [('member', 'custom_field')]`

**5. `MemberTransferLog(BaseUUIDModel)`**
- حقول: `member` (FK→Member, related_name='transfers'), `from_team` (FK→structure.Team, null=True, related_name='+', on_delete=SET_NULL), `to_team` (FK→structure.Team, null=True, related_name='+', on_delete=SET_NULL), `from_stage` (FK→structure.Stage, null=True, related_name='+', on_delete=SET_NULL), `to_stage` (FK→structure.Stage, null=True, related_name='+', on_delete=SET_NULL), `transferred_at` (DateTimeField, auto_now_add=True), `reason` (TextField, blank=True), `transferred_by` (FK→settings.AUTH_USER_MODEL, null=True, on_delete=SET_NULL)

**الملفات:**
- `backend/apps/members/__init__.py`
- `backend/apps/members/apps.py` (name='apps.members', verbose_name='إدارة الأفراد')
- `backend/apps/members/models.py`
- `backend/apps/members/migrations/__init__.py`

---

### ✅ الخطوة 5 — إنشاء Migrations للتطبيقات الثلاثة

**ما يجب فعله:** تشغيل `makemigrations` لكل تطبيق ثم `migrate`.

```powershell
cd "d:\scout system"
.venv\Scripts\python.exe backend\manage.py makemigrations users structure members
.venv\Scripts\python.exe backend\manage.py migrate
```

**التحقق:**
```powershell
.venv\Scripts\python.exe backend\manage.py showmigrations users structure members
# يجب أن تظهر جميع الـ migrations بعلامة [X]
```

---

### ✅ الخطوة 6 — `apps/users`: Serializers + Permissions + Views + URLs + Tests

**ما يجب فعله:** طبقة الـ API الكاملة لـ users.

#### `backend/apps/users/permissions.py`
```python
# BaseScopedPermission: كلاس أساسي يرث BasePermission
# - دالة has_permission(request, view): تتحقق من is_authenticated + الصلاحيات في request.user.permission.permissions
# - دالة get_user_scope_ids(user, scope_type): ترجع قائمة scope_ids للمستخدم
# - دالة is_admin(user): user.role == 'ADMIN'
```

#### `backend/apps/users/mixins.py`
```python
# AuditMixin: mixin لـ ViewSet
# - override perform_create: يستدعي AuditLog.objects.create(action=CREATE, entity_type=..., entity_id=..., new_values=..., user=request.user, ip_address=get_client_ip(request))
# - override perform_update: يسجل old_values (قبل الحفظ) و new_values (بعد)
# - override perform_destroy: يسجل DELETE مع old_values
# - دالة مساعدة get_client_ip(request): تقرأ HTTP_X_FORWARDED_FOR ثم REMOTE_ADDR
```

#### `backend/apps/users/serializers.py`
خمسة serializers:
1. `UserSerializer(ModelSerializer)` — حقول: id, username, full_name, email, phone, role, is_active, date_joined. `read_only_fields = ['id', 'date_joined']`
2. `UserCreateSerializer(ModelSerializer)` — يضيف `password` (write_only), `permission_template_id` (UUIDField, write_only, optional). في `create()`: ينشئ المستخدم بـ `set_password`, ثم إذا وُجد القالب ينشئ `UserPermission` بنسخ permissions القالب.
3. `PermissionTemplateSerializer(ModelSerializer)` — جميع الحقول
4. `UserSessionSerializer(ModelSerializer)` — id, device_info, ip_address, created_at, last_activity, is_active
5. `LoginSerializer(Serializer)` — username, password (write_only)

#### `backend/apps/users/views.py`
أربعة ViewSets + ثلاث APIViews:

**`LoginView(APIView)`** — `permission_classes = [AllowAny]`
- POST: يستخدم `authenticate(username, password)`, يتحقق من عدد الجلسات النشطة (`UserSession.objects.filter(user=user, is_active=True).count() < MAX_LEADER_SESSIONS` أو role==ADMIN يُعفى)، يستدعي `login(request, user)`, ينشئ `UserSession`, يسجل `AuditLog(LOGIN)`.
- رفض الجلسة الثالثة: يرجع 403 مع رسالة "تجاوزت الحد الأقصى للجلسات النشطة".

**`LogoutView(APIView)`**
- POST: يُبطل `UserSession` الحالية (يبحث بـ `session_key = request.session.session_key`), يستدعي `logout(request)`, يسجل AuditLog(LOGOUT).

**`MeView(APIView)`**
- GET: يرجع `UserSerializer(request.user).data`
- PATCH: يُحدِّث full_name, email, phone فقط (لا role, لا username)

**`UserViewSet(AuditMixin, ModelViewSet)`** — يتطلب `is_admin` في `BaseScopedPermission`
- CRUD كامل للمستخدمين
- action إضافية: `@action POST users/{id}/assign_template/` — يُسند قالب ويُعيد نسخ الصلاحيات للمستخدم المحدد

**`PermissionTemplateViewSet(AuditMixin, ModelViewSet)`**
- CRUD كامل لقوالب الصلاحيات (للأدمن فقط)

**`UserSessionViewSet(ModelViewSet)`** — list + destroy فقط
- list: يُرجع الجلسات النشطة للمستخدم الحالي (أو الكل للأدمن)
- destroy: يُبطل الجلسة (is_active=False) + يحذف session من Django

#### `backend/apps/users/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, LogoutView, MeView, UserViewSet, PermissionTemplateViewSet, UserSessionViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('permission-templates', PermissionTemplateViewSet, basename='permission-template')
router.register('sessions', UserSessionViewSet, basename='session')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]
```

#### `backend/apps/users/tests/__init__.py` + `test_users.py`
اختبارات pytest:
- `test_login_success`: تسجيل دخول صحيح → 200 + session
- `test_login_wrong_password`: → 401
- `test_session_limit`: دخول ثالث → 403
- `test_logout`: → session تُلغى
- `test_me_authenticated`: → بيانات المستخدم
- `test_me_unauthenticated`: → 403
- `test_user_crud_admin_only`: أدمن يُنشئ/يُحدِّث/يحذف مستخدم
- `test_permission_template_create`: أدمن يُنشئ قالب → يُسنده لمستخدم → الصلاحيات مستقلة

**الملفات:**
- `backend/apps/users/permissions.py`
- `backend/apps/users/mixins.py`
- `backend/apps/users/serializers.py`
- `backend/apps/users/views.py`
- `backend/apps/users/urls.py`
- `backend/apps/users/tests/__init__.py`
- `backend/apps/users/tests/test_users.py`

**التحقق:**
```powershell
.venv\Scripts\pytest.exe backend\apps\users\tests\ -v
```

---

### ✅ الخطوة 7 — `apps/structure`: Serializers + Views + URLs + Tests

**ما يجب فعله:** طبقة API كاملة للهيكل التنظيمي.

#### `backend/apps/structure/serializers.py`
- `ScoutYearSerializer` — جميع الحقول
- `GroupSerializer` — id, name, type, description
- `SectorSerializer` — id, name, group (FK as id)
- `StageSerializer` — id, name, group (FK as id), order
- `TeamSerializer` — id, name, stage_id, sector_id, leader_id, description. يُضيف `stage_name`, `leader_name` كـ SerializerMethodField.
- `PatrolSerializer` — id, name, team_id, leader_id. يُضيف `team_name`.

#### `backend/apps/structure/filters.py`
- `TeamFilter(FilterSet)`: يُصفِّي على stage, sector, leader
- `PatrolFilter(FilterSet)`: يُصفِّي على team

#### `backend/apps/structure/views.py`
ستة ViewSets، جميعها تستخدم `AuditMixin` من `apps.users.mixins`:
- `ScoutYearViewSet` — CRUD + فلتر is_active
- `GroupViewSet` — CRUD + بحث على name
- `SectorViewSet` — CRUD + فلتر group
- `StageViewSet` — CRUD + فلتر group + ترتيب order
- `TeamViewSet` — CRUD + بحث على name + فلتر stage/sector/leader
- `PatrolViewSet` — CRUD + بحث على name + فلتر team

جميعها تُعيد فقط السجلات غير المحذوفة (`queryset = Model.objects.alive()` باستخدام SoftDeleteManager).

#### `backend/apps/structure/urls.py`
```python
router = DefaultRouter()
router.register('scout-years', ScoutYearViewSet)
router.register('groups', GroupViewSet)
router.register('sectors', SectorViewSet)
router.register('stages', StageViewSet)
router.register('teams', TeamViewSet)
router.register('patrols', PatrolViewSet)
```

#### `backend/apps/structure/tests/test_structure.py`
- `test_create_group`
- `test_create_stage_with_order`
- `test_soft_delete_team`: حذف فريق → لا يظهر في list
- `test_restore_team_admin`: استرجاع فريق محذوف
- `test_active_scout_year_uniqueness`: تفعيل سنة → السنة الأخرى تُلغى

**الملفات:**
- `backend/apps/structure/serializers.py`
- `backend/apps/structure/filters.py`
- `backend/apps/structure/views.py`
- `backend/apps/structure/urls.py`
- `backend/apps/structure/tests/__init__.py`
- `backend/apps/structure/tests/test_structure.py`

**التحقق:**
```powershell
.venv\Scripts\pytest.exe backend\apps\structure\tests\ -v
```

---

### ✅ الخطوة 8 — `apps/members`: Serializers + Views + URLs + Tests

**ما يجب فعله:** طبقة API الكاملة للأفراد.

#### `backend/apps/members/serializers.py`
- `MemberListSerializer` — حقول خفيفة: id, full_name, stage_code, group_name, stage_name, team_name, is_active (للقوائم)
- `MemberDetailSerializer` — جميع الحقول + qr_image URL + custom_values + transfers
- `MemberCreateUpdateSerializer` — حقول الكتابة مع `national_id` (write_only, عادي) — في `create()/update()` يُشفَّر بـ `encrypt_bytes` قبل الحفظ في `national_id_encrypted`
- `MemberTransferSerializer` — to_team, to_stage, reason (validates ثم ينشئ MemberTransferLog + يُحدِّث المستخدم + يُنشئ stage_code جديد + يُحفظ القديم في MemberCodeHistory)
- `CustomFieldSerializer`
- `CustomFieldValueSerializer`
- `ExcelImportPreviewSerializer` — يُعيد قائمة بـ {new, update, conflicts}

#### `backend/apps/members/filters.py`
`MemberFilter(FilterSet)`: group, stage, team, patrol, scout_year, gender, is_active, بحث full_name/stage_code/national_id (المشفر لا يُبحث مباشرة — البحث على full_name فقط)

#### `backend/apps/members/services/excel_import.py`
```python
# parse_excel_import(file_bytes) -> dict:
#   يقرأ xlsx بـ openpyxl
#   يُرجع {'new': [...], 'update': [...], 'conflicts': [...]}
#   التحقق من التكرار: إذا وُجد stage_code أو national_id (بعد تشفير والمقارنة) → conflict
#   لا يحفظ أي شيء — فقط معاينة

# confirm_excel_import(parsed_data, scout_year_id, user) -> int:
#   ينفذ الحفظ الفعلي بعد معاينة
#   يسجل AuditLog(IMPORT)
```

#### `backend/apps/members/views.py`
- `MemberViewSet(AuditMixin, ModelViewSet)` — CRUD + بحث + تصفية + pagination
  - action: `@action POST members/{id}/transfer/` — يستدعي MemberTransferSerializer
  - action: `@action GET members/{id}/qr/` — يُرجع QR PNG مباشرة (HttpResponse image/png)
  - action: `@action POST members/import-preview/` — يستدعي `parse_excel_import`
  - action: `@action POST members/import-confirm/` — يستدعي `confirm_excel_import` + AuditLog
  - action: `@action GET members/export/` — يُولِّد Excel بـ openpyxl + يُرجع XLSX response + يسجل AuditLog(EXPORT)
- `CustomFieldViewSet(AuditMixin, ModelViewSet)` — CRUD لقوالب الحقول المخصصة

#### `backend/apps/members/urls.py`
```python
router.register('members', MemberViewSet, basename='member')
router.register('custom-fields', CustomFieldViewSet, basename='custom-field')
```

#### اختبارات `backend/apps/members/tests/test_members.py`
- `test_create_member_generates_stage_code`
- `test_create_member_generates_qr`
- `test_national_id_encrypted_at_rest`
- `test_member_transfer_creates_log_and_new_code`
- `test_excel_import_preview_no_save`
- `test_excel_import_confirm_saves`
- `test_export_excel_returns_xlsx`
- `test_soft_delete_member`

**الملفات:**
- `backend/apps/members/serializers.py`
- `backend/apps/members/filters.py`
- `backend/apps/members/services/__init__.py`
- `backend/apps/members/services/excel_import.py`
- `backend/apps/members/views.py`
- `backend/apps/members/urls.py`
- `backend/apps/members/tests/__init__.py`
- `backend/apps/members/tests/test_members.py`

**التحقق:**
```powershell
.venv\Scripts\pytest.exe backend\apps\members\tests\ -v
```

---

### ✅ الخطوة 9 — تحديث `config/urls.py`

**الملف:** `backend/config/urls.py`

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.common.urls')),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.structure.urls')),
    path('api/', include('apps.members.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

**التحقق:**
```powershell
.venv\Scripts\python.exe backend\manage.py check
.venv\Scripts\ruff.exe check backend
```

---

### ✅ الخطوة 10 — تشغيل كامل الاختبارات + Ruff

```powershell
cd "d:\scout system"
.venv\Scripts\pytest.exe -v
.venv\Scripts\ruff.exe check backend
```

يجب: 0 failures، 0 ruff errors.

---

### ✅ الخطوة 11 — Frontend: تثبيت zustand + تهيئة الملفات الأساسية

**ما يجب فعله:** تثبيت zustand، إنشاء هيكل المجلدات، TypeScript types، axios instances، Zustand store.

```powershell
cd "d:\scout system\frontend"
npm install zustand@^4.5.5
```

#### `frontend/src/types/index.ts`
Interfaces TypeScript (strict, no `any`):
```typescript
export interface User { id: string; username: string; full_name: string; email: string; phone: string; role: 'ADMIN' | 'LEADER' | 'ASSISTANT'; is_active: boolean; date_joined: string; }
export interface UserSession { id: string; device_info: string; ip_address: string | null; created_at: string; last_activity: string; is_active: boolean; }
export interface PermissionTemplate { id: string; name: string; permissions: Record<string, unknown>; description: string; }
export interface ScoutYear { id: string; name: string; start_date: string; end_date: string; is_active: boolean; }
export interface Group { id: string; name: string; type: 'SCOUT' | 'GUIDE' | 'NAVAL'; description: string; }
export interface Sector { id: string; name: string; group: string; }
export interface Stage { id: string; name: string; group: string; order: number; }
export interface Team { id: string; name: string; stage: string; stage_name: string; sector: string | null; leader: string | null; leader_name: string | null; description: string; }
export interface Patrol { id: string; name: string; team: string; team_name: string; leader: string | null; }
export interface MemberList { id: string; full_name: string; stage_code: string; group_name: string; stage_name: string; team_name: string; is_active: boolean; }
export interface Member extends MemberList { date_of_birth: string | null; gender: 'M' | 'F'; phone: string; guardian_phone: string; address: string; photo: string | null; qr_image: string | null; group: string | null; stage: string | null; team: string | null; patrol: string | null; scout_year: string | null; custom_values: CustomFieldValue[]; transfers: MemberTransfer[]; }
export interface MemberTransfer { id: string; from_team_name: string; to_team_name: string; from_stage_name: string; to_stage_name: string; transferred_at: string; reason: string; }
export interface CustomField { id: string; name: string; field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'; required: boolean; options: string[]; }
export interface CustomFieldValue { id: string; custom_field: string; custom_field_name: string; value: string; }
export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }
export interface LoginCredentials { username: string; password: string; }
export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; }
```

#### `frontend/src/api/client.ts`
```typescript
// axios instance مع baseURL = '/api' (Vite proxy), withCredentials: true
// interceptor للـ CSRF: يقرأ csrftoken من الكوكيز ويُضيفه لـ X-CSRFToken header في POST/PUT/PATCH/DELETE
// interceptor للأخطاء: إذا 401 يُعيد التوجيه لـ /login
```

**`frontend/vite.config.ts`** — أضف proxy:
```typescript
proxy: {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
  '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
}
```

#### `frontend/src/api/auth.ts`
```typescript
export const authApi = {
  login: (creds: LoginCredentials) => client.post<User>('/api/auth/login/', creds),
  logout: () => client.post('/api/auth/logout/'),
  me: () => client.get<User>('/api/auth/me/'),
  sessions: () => client.get<UserSession[]>('/api/sessions/'),
  deleteSession: (id: string) => client.delete(`/api/sessions/${id}/`),
}
```

#### `frontend/src/api/structure.ts`
```typescript
export const structureApi = {
  getGroups: () => client.get<PaginatedResponse<Group>>('/api/groups/'),
  getStages: (groupId?: string) => client.get<PaginatedResponse<Stage>>('/api/stages/', { params: { group: groupId } }),
  getTeams: (params?: object) => client.get<PaginatedResponse<Team>>('/api/teams/', { params }),
  getPatrols: (teamId?: string) => client.get<PaginatedResponse<Patrol>>('/api/patrols/', { params: { team: teamId } }),
  getScoutYears: () => client.get<PaginatedResponse<ScoutYear>>('/api/scout-years/'),
  // + createGroup, updateGroup, deleteGroup, createStage, ...إلخ
}
```

#### `frontend/src/api/members.ts`
```typescript
export const membersApi = {
  list: (params?: object) => client.get<PaginatedResponse<MemberList>>('/api/members/', { params }),
  get: (id: string) => client.get<Member>(`/api/members/${id}/`),
  create: (data: FormData) => client.post<Member>('/api/members/', data, { headers: {'Content-Type': 'multipart/form-data'} }),
  update: (id: string, data: FormData) => client.patch<Member>(`/api/members/${id}/`, data, { headers: {'Content-Type': 'multipart/form-data'} }),
  delete: (id: string) => client.delete(`/api/members/${id}/`),
  transfer: (id: string, data: object) => client.post(`/api/members/${id}/transfer/`, data),
  getQR: (id: string) => `/api/members/${id}/qr/`,
  importPreview: (file: File) => { const fd = new FormData(); fd.append('file', file); return client.post('/api/members/import-preview/', fd); },
  importConfirm: (data: object) => client.post('/api/members/import-confirm/', data),
  export: () => client.get('/api/members/export/', { responseType: 'blob' }),
}
```

#### `frontend/src/api/users.ts`
```typescript
export const usersApi = {
  list: () => client.get<PaginatedResponse<User>>('/api/users/'),
  create: (data: object) => client.post<User>('/api/users/', data),
  update: (id: string, data: object) => client.patch<User>(`/api/users/${id}/`, data),
  delete: (id: string) => client.delete(`/api/users/${id}/`),
  getTemplates: () => client.get<PaginatedResponse<PermissionTemplate>>('/api/permission-templates/'),
  createTemplate: (data: object) => client.post('/api/permission-templates/', data),
  assignTemplate: (userId: string, templateId: string) => client.post(`/api/users/${userId}/assign_template/`, { template_id: templateId }),
}
```

#### `frontend/src/store/authStore.ts`
```typescript
// Zustand store:
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}
// login: يستدعي authApi.login → sets user → isAuthenticated=true
// logout: يستدعي authApi.logout → clears state
// fetchMe: يستدعي authApi.me → sets user أو clears on 401
```

#### `frontend/src/hooks/useAuth.ts`
```typescript
// wrapper على authStore — يُعيد { user, isAuthenticated, isLoading, login, logout }
```

#### `frontend/src/hooks/usePermission.ts`
```typescript
// يُعيد isAdmin: boolean بناءً على user.role === 'ADMIN'
// يُعيد canAccess(permission: string): boolean من user permissions JSON
```

#### `frontend/src/hooks/useDebounce.ts`
```typescript
// useDebounce<T>(value: T, delay: number): T — setTimeout/clearTimeout pattern
```

#### `frontend/src/hooks/usePagination.ts`
```typescript
// usePagination(initialPage=1, pageSize=20): { page, setPage, pageSize, setPageSize }
```

#### `frontend/src/utils/formatDate.ts`
```typescript
export function formatDate(date: string | null): string // بالعربي ar-EG
export function formatAge(dob: string | null): string // يحسب العمر من تاريخ الميلاد
```

#### `frontend/src/utils/formatCode.ts`
```typescript
export function formatStageCode(code: string | null): string // SC-27-A-001 → يُرجع كما هو أو placeholder
```

**الملفات:**
- `frontend/src/types/index.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/api/structure.ts`
- `frontend/src/api/members.ts`
- `frontend/src/api/users.ts`
- `frontend/src/store/authStore.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/usePermission.ts`
- `frontend/src/hooks/useDebounce.ts`
- `frontend/src/hooks/usePagination.ts`
- `frontend/src/utils/formatDate.ts`
- `frontend/src/utils/formatCode.ts`
- `frontend/vite.config.ts` (تعديل — إضافة proxy)

**التحقق:**
```powershell
cd "d:\scout system\frontend"
npm run build
# يجب 0 TypeScript errors
```

---

### ✅ الخطوة 12 — Frontend: مكونات UI + Layout

**ما يجب فعله:** إكمال مكونات UI الناقصة + Layout components.

#### مكونات UI الجديدة في `frontend/src/components/ui/`

**`Card.tsx`**
```typescript
// Card, CardHeader, CardTitle, CardContent, CardFooter
// يستخدم bg-surface border border-border rounded-xl p-4
```

**`Table.tsx`**
```typescript
// Table, TableHeader, TableBody, TableRow, TableCell, TableHead
// يستخدم table-responsive wrapper + RTL-safe classes
// كل row له hover:bg-surface-2
```

**`Dialog.tsx`**
```typescript
// يُلفّ @radix-ui/react-dialog
// DialogRoot, DialogTrigger, DialogContent (centered, bg-surface, border border-border, shadow-lg, rounded-2xl)
// DialogHeader, DialogTitle, DialogDescription, DialogFooter
```

**`Select.tsx`**
```typescript
// يُلفّ @radix-ui/react-select
// يدعم RTL — PopoverContent يُفتح للأعلى أو للأسفل تلقائياً
```

**`Spinner.tsx`**
```typescript
// دائرة دوارة بلون gold-400
// interface: size?: 'sm' | 'md' | 'lg'
```

**`Pagination.tsx`**
```typescript
// يُرجع أزرار "السابق" / "التالي" + رقم الصفحة الحالية
// يستخدم Button مع variant='ghost' للأرقام وvariant='outline' للسابق/التالي
```

#### Layout في `frontend/src/components/layout/`

**`Sidebar.tsx`**
```typescript
// Props: collapsed: boolean, onToggle: () => void
// الهيكل:
//   - أعلى: شعار المجموعة (/logo.png من public/) + اسم النظام
//   - وسط: قائمة تنقل مع أيقونات Lucide:
//     - الرئيسية (Home → /dashboard)
//     - الأفراد (Users → /members)
//     - الهيكل (Building2 → /structure)
//     - المستخدمون (Shield → /users) — يظهر فقط للأدمن (isAdmin)
//   - أسفل: avatar المستخدم (أول حرف من full_name) + الاسم + دور + زر تسجيل خروج
// عند collapsed: يُخفي النصوص ويُبقي الأيقونات فقط
// يستخدم CSS var --sidebar-width و--sidebar-collapsed من tokens.css
// position: fixed, right side (RTL)، z-index: var(--z-drawer)
```

**`Topbar.tsx`**
```typescript
// Props: onMenuToggle: () => void
// يُظهر: زر قائمة (Menu icon) + عنوان الصفحة الحالية (من react-router location) + اسم المستخدم
// height: var(--topbar-height)، bg-surface، border-b border-border
```

**`MainLayout.tsx`**
```typescript
// يُدمج Sidebar + Topbar + Outlet (react-router)
// يُدير حالة collapsed للـ sidebar
// يُطبّق class 'layout-main' و'sidebar-collapsed' من tokens.css
// يتحقق من isAuthenticated — إذا لا → <Navigate to='/login' />
```

#### Shared Components في `frontend/src/components/shared/`

**`LoadingSpinner.tsx`**
```typescript
// Full-page spinner: min-h-screen flex items-center justify-center + <Spinner size='lg' />
```

**`EmptyState.tsx`**
```typescript
// Props: title, description, action?
// يُظهر أيقونة + نص + زر اختياري
```

**`ConfirmDialog.tsx`**
```typescript
// يُلفّ Dialog: يُظهر رسالة تأكيد + زرين (تأكيد/إلغاء)
// Props: open, onConfirm, onCancel, title, description, variant?: 'destructive' | 'default'
```

**`AvatarWithFallback.tsx`**
```typescript
// يُلفّ @radix-ui/react-avatar: يُظهر الصورة إذا وُجدت وإلا أول حرف من الاسم
```

**التحقق:**
```powershell
cd "d:\scout system\frontend"
npm run build
```

---

### ✅ الخطوة 13 — Frontend: الصفحات

**ما يجب فعله:** إنشاء جميع الصفحات المطلوبة.

#### `frontend/src/pages/auth/LoginPage.tsx`
- خلفية: `bg-bg` (#090a0f من tokens.css)
- مركز الشاشة: بطاقة `bg-surface rounded-2xl p-8 shadow-lg` عرض max-w-sm
- شعار `/logo.png` أعلى البطاقة، حجم w-20 h-20
- عنوان "مجموعات أبي سيفين الكشفية" بلون `text-gold-400`
- حقل `username` + حقل `password` (type="password")، كلاهما من مكوّن `<Input />`
- زر "دخول" من `<Button variant='primary' loading={isSubmitting} />`
- يستخدم `react-hook-form` + `zod` للـ validation: username مطلوب، password مطلوب
- عند الخطأ: يُظهر رسالة واضحة ("اسم المستخدم أو كلمة المرور غير صحيحة")
- عند النجاح: `navigate('/dashboard')`

#### `frontend/src/pages/dashboard/DashboardPage.tsx`
- أربع بطاقات إحصائية (StatCard component محلي):
  - إجمالي الأفراد (يُحسب من `PaginatedResponse.count` عند استدعاء `membersApi.list({page_size:1})`)
  - الفرق النشطة (من `structureApi.getTeams()`)
  - الجلسات النشطة اليوم (من `authApi.sessions()`)
  - تنبيه: "أنت أدمن" أو "وصولك: {scope}"
- جدول آخر 10 أفراد مُضافين (من `membersApi.list({ordering:'-created_at', page_size:10})`)
- مخطط Recharts من نوع `BarChart`: توزيع الأفراد على المراحل
  - المحور x: stage_name، المحور y: count
  - fill: `#d4a338` (gold-400)
  - `ResponsiveContainer` عرض 100%

#### `frontend/src/pages/members/MembersListPage.tsx`
- `<Input>` بحث بـ useDebounce(300ms)
- أزرار تصفية: المجموعة / المرحلة / الفريق / الجنس (Select components)
- `<Table>` بأعمدة: الاسم، كود المرحلة، المجموعة، المرحلة، الفريق، الحالة (Badge)، إجراءات
- Pagination كاملة
- أزرار:
  - "إضافة فرد" → navigate('/members/new')
  - "تصدير Excel" → يستدعي `membersApi.export()` + يُنشئ Blob URL + يُحمِّل الملف
  - "استيراد Excel" → يُفتح Dialog مع:
    - خطوة 1: رفع ملف → استدعاء `importPreview` → عرض الملخص
    - خطوة 2: تأكيد → استدعاء `importConfirm`
- كل row لها: زر عرض (Eye icon → navigate)، تعديل (Edit → navigate)، حذف (Trash → ConfirmDialog)

#### `frontend/src/pages/members/MemberDetailPage.tsx`
- رأس الصفحة: صورة الفرد (AvatarWithFallback) + الاسم + كود المرحلة (Badge gold)
- تبويبات (Radix Tabs): بيانات أساسية | انتقالات | حقول مخصصة
- بيانات أساسية: grid 2 أعمدة — تاريخ الميلاد، الجنس، الهاتف، هاتف ولي الأمر، العنوان، المجموعة، المرحلة، الفريق، الرهط، السنة الكشفية
- QR code: `<img src={membersApi.getQR(id)} />` داخل بطاقة منفصلة
- جدول الانتقالات: من/إلى + السبب + التاريخ
- حقول مخصصة: قائمة name/value

#### `frontend/src/pages/members/MemberFormPage.tsx`
- يُستخدم لإنشاء وتعديل الأفراد
- `react-hook-form` + `zod` schema
- حقول: full_name (مطلوب)، gender (Select)، date_of_birth (date input)، phone، guardian_phone، address، national_id (write-only)، photo (file upload)، group (Select → يُحمِّل groups)، stage (Select → يُحمِّل stages حسب group)، team (Select)، patrol (Select)، scout_year (Select)
- عند submit: يُنشئ `FormData` ويستدعي create أو update
- validation: full_name مطلوب، gender مطلوب

#### `frontend/src/pages/structure/StructurePage.tsx`
- شجرة: Group → Stage → Team → Patrol
- يُستخدم نمط accordion/tree بـ Radix Tabs أو nested cards
- لكل مستوى: زر إضافة + تعديل + حذف (مع ConfirmDialog)
- الإضافة/التعديل تفتح Dialog مع form بسيط
- يُحمِّل البيانات بـ `@tanstack/react-query` (useQuery مع queryKey حسب المستوى)

#### `frontend/src/pages/users/UsersPage.tsx`
- يُظهر فقط إذا `isAdmin` — وإلا يُعيد `<Navigate to='/dashboard' />`
- جدول المستخدمين: اسم المستخدم، الاسم، الدور (Badge)، الحالة، آخر جلسة
- أزرار: إضافة مستخدم (Dialog)، تعديل، حذف
- قسم قوالب الصلاحيات: جدول مع إضافة/تعديل/حذف
- Dialog إنشاء مستخدم: username, full_name, email, phone, role (Select), password, permission_template (Select اختياري)

---

### ✅ الخطوة 14 — تحديث `App.tsx` + إعادة توجيه التطبيق

**الملف:** `frontend/src/App.tsx` — استبدال المحتوى الحالي (Phase 0 diagnostics) بـ React Router.

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { MainLayout } from './components/layout/MainLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { MembersListPage } from './pages/members/MembersListPage'
import { MemberDetailPage } from './pages/members/MemberDetailPage'
import { MemberFormPage } from './pages/members/MemberFormPage'
import { StructurePage } from './pages/structure/StructurePage'
import { UsersPage } from './pages/users/UsersPage'
import { LoadingSpinner } from './components/shared/LoadingSpinner'

export default function App() {
  const { fetchMe, isLoading, isAuthenticated } = useAuthStore()
  
  useEffect(() => { fetchMe() }, [])
  
  if (isLoading) return <LoadingSpinner />
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersListPage />} />
          <Route path="/members/new" element={<MemberFormPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/members/:id/edit" element={<MemberFormPage />} />
          <Route path="/structure" element={<StructurePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

**التحقق النهائي:**
```powershell
cd "d:\scout system\frontend"
npm run build
# يجب: vite build بدون أخطاء TypeScript
```

```powershell
cd "d:\scout system"
.venv\Scripts\pytest.exe -v
.venv\Scripts\ruff.exe check backend
.venv\Scripts\python.exe backend\manage.py migrate
```

---

## ملخص الملفات الكاملة

### Backend — ملفات جديدة (39 ملف)
```
backend/apps/users/__init__.py
backend/apps/users/apps.py
backend/apps/users/models.py
backend/apps/users/permissions.py
backend/apps/users/mixins.py
backend/apps/users/serializers.py
backend/apps/users/views.py
backend/apps/users/urls.py
backend/apps/users/migrations/__init__.py
backend/apps/users/migrations/0001_initial.py  ← مُولَّد تلقائياً
backend/apps/users/tests/__init__.py
backend/apps/users/tests/test_users.py

backend/apps/structure/__init__.py
backend/apps/structure/apps.py
backend/apps/structure/models.py
backend/apps/structure/serializers.py
backend/apps/structure/filters.py
backend/apps/structure/views.py
backend/apps/structure/urls.py
backend/apps/structure/migrations/__init__.py
backend/apps/structure/migrations/0001_initial.py  ← مُولَّد تلقائياً
backend/apps/structure/tests/__init__.py
backend/apps/structure/tests/test_structure.py

backend/apps/members/__init__.py
backend/apps/members/apps.py
backend/apps/members/models.py
backend/apps/members/serializers.py
backend/apps/members/filters.py
backend/apps/members/views.py
backend/apps/members/urls.py
backend/apps/members/services/__init__.py
backend/apps/members/services/excel_import.py
backend/apps/members/migrations/__init__.py
backend/apps/members/migrations/0001_initial.py  ← مُولَّد تلقائياً
backend/apps/members/tests/__init__.py
backend/apps/members/tests/test_members.py
```

### Backend — ملفات مُعدَّلة (2 ملف)
```
backend/config/settings/base.py   ← إضافة LOCAL_APPS + AUTH_USER_MODEL
backend/config/urls.py             ← إضافة users/structure/members URLs + media static
```

### Frontend — ملفات جديدة (31 ملف)
```
frontend/src/types/index.ts
frontend/src/api/client.ts
frontend/src/api/auth.ts
frontend/src/api/structure.ts
frontend/src/api/members.ts
frontend/src/api/users.ts
frontend/src/store/authStore.ts
frontend/src/hooks/useAuth.ts
frontend/src/hooks/usePermission.ts
frontend/src/hooks/useDebounce.ts
frontend/src/hooks/usePagination.ts
frontend/src/utils/formatDate.ts
frontend/src/utils/formatCode.ts
frontend/src/components/ui/Card.tsx
frontend/src/components/ui/Table.tsx
frontend/src/components/ui/Dialog.tsx
frontend/src/components/ui/Select.tsx
frontend/src/components/ui/Spinner.tsx
frontend/src/components/ui/Pagination.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/components/layout/Topbar.tsx
frontend/src/components/layout/MainLayout.tsx
frontend/src/components/shared/LoadingSpinner.tsx
frontend/src/components/shared/EmptyState.tsx
frontend/src/components/shared/ConfirmDialog.tsx
frontend/src/components/shared/AvatarWithFallback.tsx
frontend/src/pages/auth/LoginPage.tsx
frontend/src/pages/dashboard/DashboardPage.tsx
frontend/src/pages/members/MembersListPage.tsx
frontend/src/pages/members/MemberDetailPage.tsx
frontend/src/pages/members/MemberFormPage.tsx
frontend/src/pages/structure/StructurePage.tsx
frontend/src/pages/users/UsersPage.tsx
```

### Frontend — ملفات مُعدَّلة (2 ملف)
```
frontend/src/App.tsx       ← إعادة كتابة بـ React Router
frontend/vite.config.ts    ← إضافة proxy للـ API
```

---

## قواعد الجودة الإلزامية لكل ملف Python

1. كل ViewSet يعدِّل بيانات → يرث `AuditMixin`
2. كل نموذج حيوي → يرث `SoftDeleteModel` + `BaseUUIDModel`
3. جميع الـ querysets في Views تستخدم `.alive()` (SoftDeleteManager)
4. `BaseScopedPermission` هو permission_class الافتراضي لكل ViewSet
5. الـ `national_id` لا يُخزَّن نصاً — يُشفَّر دائماً بـ `encrypt_bytes` قبل الحفظ

## قواعد الجودة الإلزامية لكل ملف TypeScript

1. لا `any` غير مبرر — استخدم الـ interfaces من `types/index.ts`
2. كل API call يمر عبر `api/client.ts` (لا axios مستقل)
3. لا ألوان Tailwind صلبة (hardcoded) — استخدم CSS vars: `bg-surface`, `text-gold-400`, إلخ
4. لا `margin-left`/`margin-right` — استخدم `ms-`/`me-` للـ RTL
5. كل form يستخدم `react-hook-form` + `zod` schema
