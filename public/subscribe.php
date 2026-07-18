<?php
declare(strict_types=1);

/**
 * Green Tea launch-list capture.
 *
 * The static site POSTs here (same origin on the cPanel subdomain). A valid
 * email lands in MySQL; duplicates are a silent no-op. DB credentials live in
 * subscribe.config.php, kept OUTSIDE the web root — see server/ in the repo.
 */

header('X-Content-Type-Options: nosniff');

/** Reply as JSON to fetch(), redirect back for a no-JS form post. */
function respond(bool $ok, int $code, string $message, bool $wantsJson): void
{
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json');
        echo json_encode(['ok' => $ok, 'message' => $message]);
    } else {
        header('Location: /?subscribed=' . ($ok ? '1' : '0') . '#subscribe');
    }
    exit;
}

$wantsJson = isset($_SERVER['HTTP_X_REQUESTED_WITH'])
    && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'fetch';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(false, 405, 'Method not allowed.', $wantsJson);
}

// Honeypot: bots fill hidden fields, people don't. Accept silently, store nothing.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(true, 200, "You're on the list.", $wantsJson);
}

$email = trim((string) ($_POST['email'] ?? ''));
if ($email === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 422, 'Please enter a valid email address.', $wantsJson);
}

// Config one level above the web root is preferred; same-dir is a fallback.
$configFile = __DIR__ . '/../subscribe.config.php';
if (!is_file($configFile)) {
    $configFile = __DIR__ . '/subscribe.config.php';
}
if (!is_file($configFile)) {
    error_log('subscribe: missing subscribe.config.php');
    respond(false, 500, 'Signups are not configured yet.', $wantsJson);
}
$config = require $configFile;

try {
    $pdo = new PDO($config['dsn'], $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Unique index on email makes this idempotent — a repeat signup is a no-op.
    $stmt = $pdo->prepare(
        'INSERT INTO subscribers (email, created_at, ip) VALUES (:email, NOW(), :ip)
         ON DUPLICATE KEY UPDATE email = email'
    );
    $stmt->execute([
        ':email' => $email,
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
} catch (Throwable $e) {
    error_log('subscribe: ' . $e->getMessage());
    respond(false, 500, 'Could not save that right now — try again later.', $wantsJson);
}

// Optional heads-up email. Never fatal: the DB row is the source of truth.
if (!empty($config['notify'])) {
    @mail(
        (string) $config['notify'],
        'Green Tea: new subscriber',
        "New launch-list signup: {$email}",
        'From: Green Tea <' . $config['notify'] . '>'
    );
}

respond(true, 200, "You're on the list — we'll ping you at 1.0.", $wantsJson);
