-- Make scorm-packages bucket public to allow uploads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'scorm-packages';