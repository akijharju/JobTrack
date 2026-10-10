-- Initial schema: rerunning this file does not update existing table definitions.
CREATE TABLE IF NOT EXISTS users (
    -- Generate stable identifiers independently of editable account details.
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- Enforce uniqueness in the database even for concurrent registrations.
    username VARCHAR(30) NOT NULL UNIQUE,
    -- Store only the password hash, never the original password.
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Each row is one user's tracking record, even if others track the same posting.
CREATE TABLE IF NOT EXISTS jobs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- The API must obtain ownership from verified authentication, not client input.
    user_id INT UNSIGNED NOT NULL,
    -- NOT NULL requires a value; the API must also reject blank names.
    company VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    -- Optional details remain NULL until the user supplies them.
    location VARCHAR(150),
    url VARCHAR(2048),
    -- Store a calendar date without a time or timezone.
    deadline DATE,
    -- Application progress is separate from priority and skill match.
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
    -- Require an existing owner and block their deletion while linked jobs remain.
    CONSTRAINT fk_jobs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
