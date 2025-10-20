import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, Wand2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptGeneratorProps {
  file: File;
}

export const TranscriptGenerator = ({ file }: TranscriptGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [transcript, setTranscript] = useState("");

  const generateTranscript = async () => {
    setGenerating(true);
    toast.info("Searching for transcript files and generating AI transcripts...");
    
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Look for subtitle/transcript files
      const transcriptExtensions = ['.vtt', '.srt', '.txt', '.sub'];
      let foundTranscripts: string[] = [];
      
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && transcriptExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          const content = await zipEntry.async("string");
          foundTranscripts.push(`=== ${filename} ===\n\n${content}`);
        }
      }
      
      // Also try to generate AI transcript for videos
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          try {
            toast.info(`Generating AI transcript for ${filename}...`);
            
            // Get small sample of video data
            const blob = await zipEntry.async("blob");
            const arrayBuffer = await blob.slice(0, Math.min(blob.size, 100000)).arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            const { data, error } = await supabase.functions.invoke('transcribe-video', {
              body: { videoBase64: base64, filename }
            });
            
            if (error) throw error;
            
            if (data?.transcript) {
              foundTranscripts.push(`=== AI Generated: ${filename} ===\n\n${data.transcript}`);
            }
          } catch (error) {
            console.error(`Error transcribing ${filename}:`, error);
          }
        }
      }
      
      if (foundTranscripts.length > 0) {
        setTranscript(foundTranscripts.join('\n\n'));
        toast.success(`Generated ${foundTranscripts.length} transcript(s)!`);
      } else {
        const placeholderTranscript = `No transcript files or videos found for transcription.

To add transcripts:
1. Extract videos using the Videos tab
2. Use external transcription services
3. Re-upload SCORM package with transcript files`;
        
        setTranscript(placeholderTranscript);
        toast.info("No content found for transcription");
      }
      
      setGenerating(false);
    } catch (error) {
      console.error("Error generating transcripts:", error);
      toast.error("Failed to generate transcripts: " + (error instanceof Error ? error.message : "Unknown error"));
      setGenerating(false);
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.vtt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded!");
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Transcript Generator</h3>
              <p className="text-sm text-muted-foreground">
                Extract and generate VTT transcripts from SCORM content
              </p>
            </div>
          </div>
          
            <Button
              onClick={generateTranscript}
              disabled={generating}
              className="gap-2 bg-gradient-to-r from-primary to-accent"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating AI Transcripts...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate AI Transcripts
                </>
              )}
            </Button>
        </div>

        {transcript && (
          <div className="space-y-4">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[300px] font-mono text-sm bg-muted/50"
              placeholder="Generated transcript will appear here..."
            />
            
            <div className="flex gap-2">
              <Button
                onClick={downloadTranscript}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download VTT
              </Button>
              <Button
                onClick={downloadTranscript}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download SRT
              </Button>
            </div>
          </div>
        )}

        {!transcript && !generating && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate Transcript" to extract content</p>
          </div>
        )}
      </Card>
    </div>
  );
};
