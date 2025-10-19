import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TranscriptGeneratorProps {
  file: File;
}

export const TranscriptGenerator = ({ file }: TranscriptGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [transcript, setTranscript] = useState("");

  const generateTranscript = async () => {
    setGenerating(true);
    toast.info("Searching for transcript files in SCORM package...");
    
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Look for subtitle/transcript files
      const transcriptExtensions = ['.vtt', '.srt', '.txt', '.sub'];
      let foundTranscript = "";
      
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir && transcriptExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          const content = await zipEntry.async("string");
          foundTranscript += `\n\n=== ${filename} ===\n\n${content}`;
        }
      }
      
      if (foundTranscript) {
        setTranscript(foundTranscript);
        toast.success("Found transcript files!");
      } else {
        // Generate placeholder that explains no transcripts found
        const placeholderTranscript = `No transcript files (.vtt, .srt) found in SCORM package.

To generate transcripts from videos:
1. Extract videos using the Videos tab
2. Use external tools like:
   - YouTube's auto-captioning (upload video first)
   - OpenAI Whisper API
   - Google Speech-to-Text
   - AWS Transcribe

The extracted transcript files can then be re-imported into your SCORM package.`;
        
        setTranscript(placeholderTranscript);
        toast.info("No transcript files found in package");
      }
      
      setGenerating(false);
    } catch (error) {
      console.error("Error extracting transcripts:", error);
      toast.error("Failed to extract transcripts");
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
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Transcript
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
