# دليل النشر والتشغيل على سيرفر الإنتاج (Hostinger VPS Deployment Guide)

يوثق هذا الدليل خطوات النشر المباشر لنظام إدارة مجموعة أبي سيفين الكشفية والإرشادية على خادم VPS يعمل بنظام **Ubuntu 22.04 / 24.04 LTS**.

---

## 1. التجهيز الأولي للسيرفر (Initial VPS Setup)

قم بالدخول إلى السيرفر عبر SSH:
```bash
ssh root@<YOUR_VPS_IP>
```

تحديث الحزم وتثبيت Docker و Docker Compose و Git:
```bash
apt update && apt upgrade -y
apt install -y curl git ufw

# تثبيت Docker الأحدث
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# إعداد الجدار الناري UFW
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 2. سحب المشروع وإعداد متغيرات الإنتاج

```bash
git clone <PRIVATE_REPO_URL> /var/www/scout-system
cd /var/www/scout-system

# إعداد ملف البيئة
cp .env.example .env
nano .env
```

**تعديل المتغيرات الأساسية في `.env` الإنتاجي:**
```ini
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<GENERATE_A_64_CHAR_RANDOM_SECRET_KEY>

ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,<VPS_IP>
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

POSTGRES_DB=scout_db
POSTGRES_USER=scout_admin
POSTGRES_PASSWORD=<STRONG_RANDOM_DB_PASSWORD>

DATABASE_URL=postgres://scout_admin:<STRONG_RANDOM_DB_PASSWORD>@db:5432/scout_db
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/1

BACKUP_ENCRYPTION_KEY=<FERNET_KEY_GENERATED_BY_PYTHON>
```

---

## 3. التشغيل الأول للنظام

تنفيذ سكربت النشر الآلي:
```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

---

## 4. إعداد شهادة SSL المجانية (Certbot HTTPS)

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d yourdomain.com -d www.yourdomain.com
```

ثم يتم تفعيل منافذ HTTPS في إعدادات Nginx وإعادة تشغيل الحاويات:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 5. النسخ الاحتياطي الدوري اليومي (Automated Daily Backups)

إضافة مهمة مجدولة في `crontab` على خادم Ubuntu لتنفيذ النسخ الاحتياطي المشفر يومياً الساعة 3:00 فجراً:
```bash
crontab -e
```
إضافة السطر التالي:
```cron
0 3 * * * /var/www/scout-system/scripts/backup.sh >> /var/log/scout_backup.log 2>&1
```

---

## 6. إجراءات الاستعادة والرجوع السريع (Restore & Rollback)

### استعادة نسخة احتياطية مشفرة:
```bash
./scripts/restore.sh backups/scout_backup_20261011_030000.enc
```

### التراجع السريع عند حدوث خطأ طارئ بعد التحديث:
```bash
./scripts/rollback.sh
```
