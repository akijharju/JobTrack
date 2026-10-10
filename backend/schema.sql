-- Initial schema: rerunning this file does not update existing table definitions.
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    -- Store only the password hash, never the original password.
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Each row is one user's tracking record, even if others track the same posting.
CREATE TABLE IF NOT EXISTS jobs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    company VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    location VARCHAR(150),
    url VARCHAR(2048),
    deadline DATE,
    status ENUM(
        'interested',
        'applied',
        'interview',
        'offer',
        'rejected'
    ) NOT NULL DEFAULT 'interested',
    -- Priority is independent of application status and skill match.
    priority ENUM(
        'high',
        'normal',
        'low'
    ) NOT NULL DEFAULT 'normal',
    -- NULL means the user has not assessed the skill match yet.
    match_level ENUM(
        'strong',
        'partial',
        'stretch'
    ),
    notes TEXT,
    -- Enforce owner existence; API queries must also enforce access to that owner's data.
    CONSTRAINT fk_jobs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
