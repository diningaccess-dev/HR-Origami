-- ============================================================
-- AI Chat: ai_chat_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_messages(user_id, created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_select" ON ai_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_insert" ON ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_chat_delete" ON ai_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
