CREATE TABLE IF NOT EXISTS public.guide_confirmed_trip_notes (
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id text NOT NULL,
  confirmed_trip_id text NOT NULL,
  content text NOT NULL DEFAULT '',
  author_name text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (auth_user_id, note_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_confirmed_trip_notes_user_trip
  ON public.guide_confirmed_trip_notes(auth_user_id, confirmed_trip_id, created_at DESC);

ALTER TABLE public.guide_confirmed_trip_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.guide_confirmed_trip_notes TO authenticated;

DROP POLICY IF EXISTS "Guides can read own confirmed trip notes" ON public.guide_confirmed_trip_notes;
CREATE POLICY "Guides can read own confirmed trip notes"
  ON public.guide_confirmed_trip_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

NOTIFY pgrst, 'reload schema';
