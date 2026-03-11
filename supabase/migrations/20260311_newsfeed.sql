-- ============================================================
-- Newsfeed: feed_posts, feed_reactions, feed_comments
-- ============================================================

-- 1. Bài đăng
CREATE TABLE IF NOT EXISTS feed_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL DEFAULT 'post'
             CHECK (type IN ('post', 'announcement', 'kudos')),
  content    text NOT NULL DEFAULT '',
  media_url  text,
  media_type text CHECK (media_type IN ('image', 'video', NULL)),
  kudos_to   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_roles     text[],
  target_locations text[],
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Reactions
CREATE TABLE IF NOT EXISTS feed_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

-- 3. Comments
CREATE TABLE IF NOT EXISTS feed_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  author_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_created   ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author     ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post   ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post    ON feed_comments(post_id);

-- RLS
ALTER TABLE feed_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments   ENABLE ROW LEVEL SECURITY;

-- Policies: all authenticated can read & insert
CREATE POLICY "feed_posts_select"   ON feed_posts   FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_posts_insert"   ON feed_posts   FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feed_posts_delete"   ON feed_posts   FOR DELETE TO authenticated USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','owner'))
);

CREATE POLICY "feed_reactions_select" ON feed_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_reactions_insert" ON feed_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feed_reactions_delete" ON feed_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "feed_comments_select" ON feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_comments_insert" ON feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feed_comments_delete" ON feed_comments FOR DELETE TO authenticated USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','owner'))
);

-- Storage bucket cho media
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-media', 'feed-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "feed_media_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'feed-media');
CREATE POLICY "feed_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'feed-media');
