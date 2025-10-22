import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { files, jobId, operation } = await req.json();

    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    console.log(`Processing ${files.length} multimedia files for job ${jobId}`);

    const results = [];

    for (const file of files) {
      const { path, blob, type } = file;
      
      // Upload original file to storage
      const fileName = path.split('/').pop();
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('extracted-videos')
        .upload(`${jobId}/${fileName}`, blob, {
          contentType: type,
          upsert: true
        });

      if (uploadError) {
        console.error(`Error uploading ${path}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabaseClient.storage
        .from('extracted-videos')
        .getPublicUrl(`${jobId}/${fileName}`);

      results.push({
        originalPath: path,
        storagePath: `${jobId}/${fileName}`,
        publicUrl: publicUrlData.publicUrl,
        type,
        status: 'uploaded'
      });
    }

    // Note: For actual HLS/DASH conversion, you would need FFmpeg
    // This would require a more complex setup with Docker containers
    // For now, we're just uploading the original files

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        files: results,
        message: 'Multimedia files uploaded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error processing multimedia:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
