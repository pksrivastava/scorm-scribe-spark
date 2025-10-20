-- Create storage buckets for SCORM content
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('scorm-packages', 'scorm-packages', false),
  ('extracted-videos', 'extracted-videos', true),
  ('transcripts', 'transcripts', true)
ON CONFLICT (id) DO NOTHING;

-- Create table for SCORM processing jobs
CREATE TABLE IF NOT EXISTS public.scorm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  video_count INTEGER DEFAULT 0,
  transcript_count INTEGER DEFAULT 0,
  assessment_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scorm_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo purposes)
CREATE POLICY "Anyone can view scorm jobs"
  ON public.scorm_jobs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert scorm jobs"
  ON public.scorm_jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update scorm jobs"
  ON public.scorm_jobs
  FOR UPDATE
  TO public
  USING (true);

-- Storage policies for buckets
CREATE POLICY "Public can view extracted videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'extracted-videos');

CREATE POLICY "Public can upload extracted videos"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'extracted-videos');

CREATE POLICY "Public can view transcripts"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'transcripts');

CREATE POLICY "Public can upload transcripts"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'transcripts');