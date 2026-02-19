# سكريبتات النشر على VPS باستخدام PM2

## 1. استنساخ المشروع
```bash
git clone https://github.com/MO7IJAZI/vevolast.git
cd vevolast
```

## 2. تثبيت المتطلبات
```bash
npm install
```

## 3. إعداد ملف .env
أنشئ ملف `.env` في مجلد المشروع:
```env
# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=vevospace
DB_PASSWORD=VevoLine1213
DB_NAME=vevospace

# Session Security
SESSION_SECRET=a_very_long_random_string_for_production_safety_mysql
SESSION_MAX_AGE=86400000

# Server Config
NODE_ENV=development
PORT=3001

# Admin Setup
ADMIN_EMAIL=admin@vevoline.com
ADMIN_PASSWORD=adminadmin123

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vevoline00@gmail.com
FROM_EMAIL=vevoline00@gmail.com
SMTP_PASS=hgmyoeuttdxocwrp
FROM_NAME=VevoLine Dashboard

# App Settings
APP_URL=https://www.vevoline.space
PRIVATE_OBJECT_DIR=./uploads
```

## 4. إنشاء قاعدة البيانات (مرة واحدة فقط)
```bash
mysql -u root -p
CREATE DATABASE vevospace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## 5. تشغيل الـ Migrations (لإنشاء الجداول)
```bash
npm run db:push
```

## 6. بناء المشروع
```bash
npm run build
```

---

## حل مشكلة "EADDRINUSE: address already in use"

المنفذ 3001 مستخدم من قبل تطبيق آخر. اتبع أحد الحلول:

### الحل الأول: إيقاف جميع التطبيقات وتشغيل التطبيق الجديد
```bash
pm2 delete all
pm2 start dist/index.js --name vevoline
pm2 save
```

### الحل الثاني: إيقاف التطبيق المحدد فقط
```bash
pm2 delete index
pm2 start dist/index.js --name vevoline
pm2 save
```

### الحل الثالث: إذا كان هناك تطبيق آخر يستخدم المنفذ
```bash
# معرفة ما يستخدم المنفذ 3001
sudo lsof -i :3001

# إيقاف العملية
sudo kill <PID>
```

---

## أوامر PM2 المفيدة

### عرض حالة التطبيق
```bash
pm2 status
```

### عرض السجلات
```bash
pm2 logs vevoline
```

### إعادة تشغيل التطبيق
```bash
pm2 restart vevoline
```

---

## تحديث التطبيق (Redeploy)

```bash
cd vevolast
git pull
npm install
npm run db:push
npm run build
pm2 delete vevoline
pm2 start dist/index.js --name vevoline
pm2 save
```
