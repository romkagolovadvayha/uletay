# Backend setup (XAMPP)

## 1. Database

1. Start **Apache** and **MySQL** in XAMPP.
2. Run install:

```bash
npm run seed:api
npm run api:install
```

Default admin: **admin** / **uletay2026**

## 2. URLs

| Service | URL |
|---------|-----|
| API (all app data) | `http://localhost/uletay/api/data.php` |
| Admin panel | `http://localhost/uletay/admin/` |
| Admin login | `http://localhost/uletay/admin/login.php` |

## 3. App

Copy `.env.example` to `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost/uletay/api
```

The app loads **all content in one request** (`GET /data.php`) and caches it for **1 minute** in memory and AsyncStorage. No repeated API calls within the TTL.

## 4. Admin

- Festival settings + hero image upload
- Stages and **colors**
- Schedule / autographs / food court (JSON editor + image upload by record ID)
- Login/password stored in MySQL (`admin_users`)

## 5. Images

Uploaded files are saved to `api/uploads/images/` and exposed as `/uletay/api/uploads/images/...`.

Set `imageUrl` on performances, autographs, food vendors, or `heroImageUrl` on festival.
