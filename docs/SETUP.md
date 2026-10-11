# دليل تجهيز بيئة التطوير من الصفر (Development Setup Guide)

يشرح هذا الدليل خطوات إعداد وتشغيل المشروع محلياً على جهاز جديد (Windows أو Linux / macOS) من البداية.

---

## 1. المتطلبات الأساسية للنظام (Prerequisites)

1. **Python**: إصدار `3.12+` أو `3.13`.
2. **Node.js**: إصدار `v22 LTS` (أو `v20+`).
3. **Git**: أحدث إصدار.
4. **Docker Desktop** (اختياري للتطوير الهجين، وإلزامي للنشر عبر الحاويات).

---

## 2. استنساخ المستودع (Clone Repository)

```bash
git clone <repository_url> "scout system"
cd "scout system"
```

---

## 3. إعداد البيئة الخلفية (Backend Setup)

### أ) إنشاء وتفعيل البيئة الافتراضية
* **على Windows (PowerShell):**
  ```powershell
  py -3.13 -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
* **على Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### ب) تثبيت الحزم والمكتبات
```bash
pip install --upgrade pip
pip install -r backend/requirements/dev.txt
```

### ج) إعداد ملف المتغيرات (.env)
انسخ النموذج الجاهز:
```bash
cp .env.example .env
```
*(ملاحظة: افتراضياً، يعمل النظام محلياً على SQLite تلقائياً دون الحاجة لإعداد سيرفر قاعدة بيانات منفصل).*

### د) تشغيل التهجيرات (Migrations)
```bash
python backend/manage.py migrate
```

### هـ) تجميع الملفات الثابتة (Collectstatic)
```bash
python backend/manage.py collectstatic --noinput
```

---

## 4. إعداد الواجهة الأمامية (Frontend Setup)

```bash
cd frontend
npm install
```

---

## 5. تشغيل بيئة التطوير (Running Dev Servers)

### تشغيل خادم Django الخلفي:
في نافذة تيرمينال أولى:
```bash
python backend/manage.py runserver 127.0.0.1:8000
```
* **الرابط:** `http://127.0.0.1:8000`
* **لوحة الإدارة:** `http://127.0.0.1:8000/admin/`
* **توثيق الـ API التفاعلي (Swagger):** `http://127.0.0.1:8000/api/docs/`
* **فحص الصحة:** `http://127.0.0.1:8000/api/health/`

### تشغيل واجهة React الأمامية (Vite):
في نافذة تيرمينال ثانية:
```bash
cd frontend
npm run dev
```
* **رابط الواجهة:** `http://localhost:5173`

---

## 6. تشغيل الاختبارات الآلية وفحص الكود (Testing & Linting)

### اختبارات Pytest وفحص الدخان:
```bash
pytest
```

### فحص الكود والتنسيق الصارم (Ruff):
```bash
ruff check backend
```

### اختبار بناء الواجهة الأمامية وفحص الأنواع (TypeScript Build):
```bash
cd frontend
npm run build
```

---

## 7. التشغيل الكامل عبر Docker Compose (اختياري محلياً)

عند توفر محرك Docker نشط:
```bash
docker compose up --build
```
هذا الأمر سيقوم بتشغيل:
- PostgreSQL 16 على المنفذ `5432`
- Redis 7.2 على المنفذ `6379`
- Django Backend على المنفذ `8000`
- React Frontend على المنفذ `5173`
