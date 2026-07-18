# Launch-list backend (cPanel)

The email capture on the site posts to `subscribe.php`, which ships in the build
(`public/subscribe.php` → `dist/subscribe.php`). To wire it up on cPanel:

1. **Create the DB** in cPanel → MySQL Databases. Note db name, user, password.
2. **Create the table**: run `schema.sql` in phpMyAdmin against that DB.
3. **Add credentials**: copy `subscribe.config.example.php` to `subscribe.config.php`,
   fill in the DB values, and upload it **one level above** the subdomain's docroot
   (so it is never web-servable). `subscribe.php` looks there first.
4. **Deploy** the built `dist/` into the subdomain docroot. `subscribe.php` is already inside it.
5. **Smoke test**:
   ```
   curl -i -X POST -H 'X-Requested-With: fetch' \
     --data 'email=test@example.com' \
     https://green-tea.expressive-tea.io/subscribe.php
   ```
   Expect `{"ok":true,...}` and a row in `subscribers`.

Notes:
- Duplicate signups are a silent success (unique index on `email`).
- A hidden honeypot field blocks basic bots.
- No-JS visitors are redirected to `/?subscribed=1`; with JS they get inline feedback.
- No rate limiting yet — add one at the cPanel/CDN layer if signups get abused.
