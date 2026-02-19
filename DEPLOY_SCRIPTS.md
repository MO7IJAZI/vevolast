# سكريبتات النشر على VPS باستخدام PM2

## ⚠️ أمر很重要 جداً

**لتشغيل Migration على MySQL، استخدم:**
```bash
npm run db:mysql
```

**NOT:**
```bash
npm run db:migrate  # ❌ هذا للـ PostgreSQL
```

---

## 1. استنساخ المشروع
```bash
git clone https://github.com/MO7IJAZI/vevolast.git
cd vevolast
```

## 2. إنشاء قاعدة البيانات (مرة واحدة فقط)
```bash
mysql -u root -p
CREATE DATABASE vevospace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## 3. إعداد ملف .env
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=vevospace
DB_PASSWORD=VevoLine1213
DB_NAME=vevospace

SESSION_SECRET=a_very_long_random_string_for_production_safety_mysql
SESSION_MAX_AGE=86400000

NODE_ENV=development
PORT=3001

ADMIN_EMAIL=admin@vevoline.com
ADMIN_PASSWORD=adminadmin123

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vevoline00@gmail.com
FROM_EMAIL=vevoline00@gmail.com
SMTP_PASS=hgmyoeuttdxocwrp
FROM_NAME=VevoLine Dashboard

APP_URL=https://www.vevoline.space
PRIVATE_OBJECT_DIR=./uploads
```

## 4. تشغيل Migration + بناء المشروع
```bash
npm install
npm run db:mysql
npm run build
```

## 5. تشغيل المشروع
```bash
pm2 start dist/index.js --name vevoline
pm2 save
```

---

## إعادة النشر (Update)
```bash
git pull
npm install
npm run db:mysql
npm run build
pm2 restart vevoline
```

---

## تسجيل الدخول
- **الرابط:** https://www.vevoline.space
- **الإيميل:** admin@vevoline.com
- **كلمة المرور:** adminadmin123
