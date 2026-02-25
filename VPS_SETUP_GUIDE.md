# VPS Setup Guide (Hostinger)

This guide will walk you through setting up the Vevoline Dashboard on a Hostinger VPS (or any Ubuntu/Debian based VPS).

## 1. Connect to your VPS
Use an SSH client (like PuTTY or Terminal) to connect:
```bash
ssh root@your_vps_ip_address
```

## 2. Update System Packages
Ensure your system is up to date:
```bash
sudo apt update && sudo apt upgrade -y
```

## 3. Install Required Software
Install Node.js (v18+), npm, git, and Process Manager (pm2).

### Install Node.js (v18 or v20)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Verify Installation
```bash
node -v
npm -v
```

### Install Git & PM2
```bash
sudo apt install -y git
sudo npm install -g pm2
```

## 4. Clone the Repository
Navigate to the directory where you want to host the app (e.g., `/var/www`):
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/MO7IJAZI/vevolast.git
cd vevolast
```

## 5. Install Dependencies
```bash
npm install
```

## 6. Configure Environment Variables
Create a `.env` file from the example:
```bash
cp .env.example .env
nano .env
```
Edit the `.env` file with your production details:
- Set `NODE_ENV=production`
- Update `DATABASE_URL` if using a remote DB (or ensure local MySQL is set up)
- Set `APP_URL=https://your-domain.com`

## 7. Build the Application
```bash
npm run build
```

## 8. Database Setup (If using local MySQL)
If you haven't installed MySQL yet:
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```
Create the database:
```bash
sudo mysql -u root -p
CREATE DATABASE vevoline_db;
EXIT;
```
Push the schema to the database:
```bash
npm run db:push
```

## 9. Start with PM2
Start the application using PM2 to keep it running in the background:
```bash
pm2 start npm --name "vevoline-dashboard" -- start
pm2 save
pm2 startup
```

## 10. Configure Nginx (Reverse Proxy)
Install Nginx to serve the app on port 80/443 instead of 5000.
```bash
sudo apt install -y nginx
```
Create a new config file:
```bash
sudo nano /etc/nginx/sites-available/vevoline
```
Add the following configuration (replace `your-domain.com`):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/vevoline /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 11. SSL Certificate (Optional but Recommended)
Secure your site with Certbot (Let's Encrypt):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---
**Done!** Your application should now be live at `https://your-domain.com`.
