CREATE TABLE IF NOT EXISTS feature_votes (
  poll_key TEXT NOT NULL,
  voter_id UUID NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('yes', 'no')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_key, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_poll_choice
  ON feature_votes (poll_key, choice);

ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE feature_votes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE feature_votes TO service_role;

