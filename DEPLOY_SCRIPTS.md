# سكريبتات النشر على VPS باستخدام PM2

## التحديثات الجديدة ✓
- ✓ دعم MySQL بالكامل
- ✓ تشغيل الـ Migration تلقائياً أثناء الـ Build
- ✓ كلمة مرور الأدمن: `adminadmin123`

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

## 5. بناء المشروع (يشمل إنشاء الجداول تلقائياً)
```bash
npm run build
```

**هذا الأمر سيقوم تلقائياً بـ:**
- إنشاء جميع جداول قاعدة البيانات
- بناء الـ Frontend
- بناء الـ Backend

## 6. تشغيل المشروع باستخدام PM2

### تشغيل التطبيق
```bash
pm2 start dist/index.js --name vevoline
```

### حفظ حالة PM2
```bash
pm2 save
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

## حل مشكلة 502 Bad Gateway

### 1. تحقق أن التطبيق يعمل
```bash
pm2 status
```

### 2. تحقق من أن المنفذ يعمل
```bash
curl http://localhost:3001
```

### 3. أعد تشغيل NGINX
```bash
sudo systemctl reload nginx
```

---

## حل مشكلة "EADDRINUSE"

```bash
pm2 delete all
pm2 start dist/index.js --name vevoline
pm2 save
```

---

## تحديث التطبيق (Redeploy)

```bash
cd vevolast
git pull
npm install
npm run build
pm2 restart vevoline
```

---

## تسجيل الدخول

- **الرابط:** https://www.vevoline.space
- **الإيميل:** admin@vevoline.com
- **كلمة المرور:** adminadmin123
