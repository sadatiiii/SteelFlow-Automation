PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leads (
 lead_id TEXT PRIMARY KEY, company_name TEXT NOT NULL, website TEXT, country TEXT, city TEXT,
 company_description TEXT, contact_name TEXT, job_title TEXT, contact_email TEXT, linkedin_url TEXT,
 phone TEXT, personalization_note TEXT, priority TEXT, lead_status TEXT NOT NULL DEFAULT 'New',
 opt_out TEXT NOT NULL DEFAULT 'No', notes TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(contact_email);

CREATE TABLE IF NOT EXISTS emails (
 email_id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, email_number INTEGER NOT NULL DEFAULT 1,
 recipient_email TEXT NOT NULL, email_subject TEXT NOT NULL DEFAULT '', email_body TEXT NOT NULL DEFAULT '',
 send_status TEXT NOT NULL DEFAULT 'Draft',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 sent_at TEXT, provider_message_id TEXT, error_message TEXT,
 FOREIGN KEY (lead_id) REFERENCES leads(lead_id)
);
CREATE INDEX IF NOT EXISTS idx_emails_lead_created ON emails(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(send_status);

CREATE TABLE IF NOT EXISTS orders (
 order_id TEXT PRIMARY KEY, lead_id TEXT, customer_name TEXT NOT NULL, contact_name TEXT,
 contact_email TEXT, contact_phone TEXT, product TEXT, quantity REAL, unit TEXT,
 order_status TEXT NOT NULL DEFAULT 'Quotation', shipping_status TEXT NOT NULL DEFAULT 'Pending',
 forwarder TEXT, tracking_number TEXT, order_date TEXT, expected_ship_date TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 notes TEXT, is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
 FOREIGN KEY (lead_id) REFERENCES leads(lead_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_lead ON orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(updated_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
 activity_id TEXT PRIMARY KEY, lead_id TEXT, order_id TEXT,
 activity_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 activity_type TEXT NOT NULL, contact_channel TEXT, message_summary TEXT,
 outcome TEXT, next_action TEXT, next_action_date TEXT, notes TEXT,
 FOREIGN KEY (lead_id) REFERENCES leads(lead_id),
 FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_lead_date ON activity_log(lead_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_order_date ON activity_log(order_id, activity_date DESC);

CREATE TABLE IF NOT EXISTS admin_users (
 user_id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS admin_sessions (
 session_id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 FOREIGN KEY (user_id) REFERENCES admin_users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions(expires_at);
