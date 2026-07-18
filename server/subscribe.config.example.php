<?php
/**
 * Copy this to `subscribe.config.php` and fill in real values.
 *
 * Place the real file ONE LEVEL ABOVE the web root if you can (so it is never
 * web-servable), e.g. /home/USER/subscribe.config.php when the docroot is
 * /home/USER/green-tea.expressive-tea.io/. subscribe.php looks there first,
 * then falls back to sitting next to it.
 *
 * Never commit the real subscribe.config.php — it holds the DB password.
 */

return [
    'dsn'    => 'mysql:host=localhost;dbname=YOUR_DB;charset=utf8mb4',
    'user'   => 'YOUR_DB_USER',
    'pass'   => 'YOUR_DB_PASSWORD',
    'notify' => 'support@expressive-tea.io', // set to '' to skip notification emails
];
