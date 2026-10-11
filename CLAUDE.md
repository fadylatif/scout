# نظام إدارة مجموعة أبي سيفين الكشفية والإرشادية

نظام ويب شامل لإدارة المجموعات الكشفية والإرشادية (~3000 فرد كبداية مع قابلية التوسع)، يغطي المجموعة البحرية ومجموعة المرشدات، وإدارة الأفراد، الفرق، الأرهط، المراحل، الحضور والغياب، الأنشطة والاجتماعات، الاختبارات، الشارات، المهام، مركز الميديا، والنسخ الاحتياطي المشفر.

---

## 🛠️ التقنيات المعتمدة (Tech Stack)

* **Backend:** Python 3.12+ / 3.13 + Django 5.1 + Django REST Framework (DRF)
* **Database:** PostgreSQL 16 (SQLite افتراضياً أثناء التطوير السريع المحلي)
* **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS v3.4 + Radix/shadcn + Lucide Icons + Recharts + FullCalendar
* **Caching & Tasks:** Redis 7.2 + Celery 5.4 + Celery Beat
* **Security & Auth:** Session Authentication مع كوكيز HttpOnly و SameSite + جدول تتبع الجلسات (حد أقصى جلستان) + Django-Axes لحظر التخمين + تشفير AES-256 Fernet للنسخ
* **Files & Media:** WeasyPrint للـ PDF العربي، openpyxl لـ Excel، qrcode للأكواد الثابتة، python-magic للتحقق الفعلي من الملفات، رفع مجزأ مع استكمال
* **Infrastructure:** Docker & Docker Compose (dev & prod) + Nginx + Gunicorn + Hostinger Ubuntu VPS

---

## 🏛️ القواعد المعمارية الإلزامية (Architectural Rules)

1. **الصلاحيات المركزية (Centralized Authorization):**
   * ممنوع التحقق من الصلاحيات في واجهة React فقط.
   * تطبيق طبقة مركزية واحدة: `BaseScopedPermission` و QuerySet scoping حسب نطاق المستخدم (فريق، مرحلة، رهط).
   * قوالب الصلاحيات تُنسخ للمستخدم عند إنشائه ثم تستقل تماماً؛ تعديل القالب لا يغير صلاحيات المستخدمين السابقين.
2. **سجل التدقيق المركزي (Audit Trail):**
   * تسجيل كل إضافة، تعديل، حذف، استيراد، تصدير، تنزيل، واعتماد في جدول `AuditLog` مع تسجيل القيمة القديمة والجديدة والفاعل وIP والوقت.
3. **الحذف المنطقي (Soft Delete):**
   * جميع السجلات الحيوية ترث من `SoftDeleteModel` مع إمكانية استرجاع فوري من شاشة الأدمن.
4. **أمان الـ IDOR والـ UUIDs:**
   * جميع الكيانات ترث من `BaseUUIDModel` لمنع تخمين المعرفات المتسلسلة.
5. **الملفات والميديا:**
   * فحص الترويسة الفعلية (Magic Bytes)، حدود حجم مخصصة (10MB صور، 25MB مستندات)، وتسجيل كل عملية تنزيل.
6. **الأكواد و الـ QR:**
   * كود QR ومعرف الفرد ثابت مدى الحياة لا يتغير، بينما كود المرحلة الحركي (`Stage Code`) يتغير عند الترقية مع أرشفة الأكواد السابقة.

---

## ⚡ أوامر التشغيل والاختبار السريعة (Developer Commands)

* **تشغيل السيرفر الخلفي:**
  ```powershell
  .\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
  ```
* **تشغيل الواجهة الأمامية:**
  ```powershell
  cd frontend; npm run dev
  ```
* **تشغيل الاختبارات الآلية (Pytest):**
  ```powershell
  .\.venv\Scripts\pytest.exe
  ```
* **فحص الكود والتنسيق (Ruff):**
  ```powershell
  .\.venv\Scripts\ruff.exe check backend
  ```
* **بناء الواجهة وفحص الأنواع:**
  ```powershell
  cd frontend; npm run build
  ```
* **تجميع الملفات الثابتة:**
  ```powershell
  .\.venv\Scripts\python.exe backend\manage.py collectstatic --noinput
  ```

---

## 📂 هيكل الوحدات والتطبيقات (Django Apps Layout)

* `apps/common/`: النواة المشتركة، النماذج المجردة، سجل التدقيق، خدمات التشفير والـ QR و Excel وفحص الملفات.
* `apps/users/`: إدارة المستخدمين، الأدوار، قوالب الصلاحيات، وجلسات الدخول النشطة (حد جلستان).
* `apps/structure/`: الهيكل التنظيمي (المجموعات، القطاعات، المراحل، الفرق، الأرهط، والسنوات الكشفية).
* `apps/members/`: إدارة الأفراد، الملفات الشخصية، سجل الانتقالات، الأكواد القديمة، والحقول المخصصة.
* `apps/attendance/`: الحضور والغياب، مسح QR، والأعذار واعتمادها.
* `apps/activities/`: الأنشطة، الاجتماعات المتكررة، التقويم الموحد، والمواقع المتزامنة.
* `apps/advancement/`: الاختبارات، الشارات، المقابلات، ومتابعة نسبة التقدم.
* `apps/tasks/`: لوحة المهام، الأولويات، والتعليقات والتذكيرات.
* `apps/approvals/`: طلبات الاعتماد وسجل قرارات القادة.
* `apps/media_center/`: مركز الميديا، الألبومات، الرفع المجزأ، ومراقبة مساحة التخزين.
* `apps/reports/`: منشئ التقارير المخصصة وتصدير PDF و Excel.
* `apps/backups/`: النسخ الاحتياطي المشفر اليومي، الاستعادة، وفحص صحة السيرفر.
