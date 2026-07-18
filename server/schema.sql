-- Launch-list table for subscribe.php. Run once against the green-tea DB.
CREATE TABLE IF NOT EXISTS subscribers (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(254) NOT NULL UNIQUE,
    created_at DATETIME     NOT NULL,
    ip         VARCHAR(45)  DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
