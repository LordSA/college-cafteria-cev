-- Phase 3 Storage Migration: Supabase Storage Buckets & Policies
-- Buckets: food-images (public), profile-images (private)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('food-images', 'food-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('profile-images', 'profile-images', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Objects Policies for food-images
DROP POLICY IF EXISTS "Public can view food catalog images" ON storage.objects;
CREATE POLICY "Public can view food catalog images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'food-images');

DROP POLICY IF EXISTS "Admins can manage food catalog images" ON storage.objects;
CREATE POLICY "Admins can manage food catalog images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'food-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'food-images' AND public.is_admin());

-- Storage Objects Policies for profile-images
DROP POLICY IF EXISTS "Users can view their own profile image" ON storage.objects;
CREATE POLICY "Users can view their own profile image"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND (
      (storage.foldername(name))[1] = 'profiles' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
CREATE POLICY "Users can upload their own profile image"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update or delete their own profile image" ON storage.objects;
CREATE POLICY "Users can update or delete their own profile image"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Canonical storage assets audit registry
CREATE TABLE IF NOT EXISTS public.storage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'supabase',
  bucket text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant storage assets" ON public.storage_assets;
CREATE POLICY "Users can view relevant storage assets"
  ON public.storage_assets
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    bucket = 'food-images' OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Service role manages storage assets" ON public.storage_assets;
CREATE POLICY "Service role manages storage assets"
  ON public.storage_assets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
