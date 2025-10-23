import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, Wand2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeScormPackage, type ContentFile } from "@/utils/scormAnalyzer";

interface TranscriptGeneratorProps {
  file: File;
  transcript?: string;
  onTranscriptChange?: (transcript: string) => void;
}

export const TranscriptGenerator = ({ file, transcript: externalTranscript, onTranscriptChange }: TranscriptGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [transcript, setTranscript] = useState(externalTranscript || "");

  useEffect(() => {
    if (externalTranscript) {
      setTranscript(externalTranscript);
    }
  }, [externalTranscript]);

  const updateTranscript = (newTranscript: string) => {
    setTranscript(newTranscript);
    onTranscriptChange?.(newTranscript);
  };

  const generateTranscript = async () => {
    setGenerating(true);
    toast.info("Analyzing SCORM package and extracting content in manifest order...");
    
    try {
      // Analyze SCORM package to get organized structure
      const analysis = await analyzeScormPackage(file);
      const transcriptParts: string[] = [];

      // Process content in manifest order
      for (const item of analysis.structure) {
        await processStructureItem(item, analysis, transcriptParts);
      }

      // Extract HTML text content
      for (const htmlFile of analysis.contentFiles.html) {
        if (htmlFile.content) {
          const textContent = extractTextFromHTML(htmlFile.content);
          if (textContent.length > 100) {
            transcriptParts.push(`=== ${htmlFile.path} ===\n\n${textContent}\n`);
          }
        }
      }

      // Extract JavaScript text content
      for (const jsFile of analysis.contentFiles.javascript) {
        if (jsFile.content) {
          const textContent = extractTextFromJS(jsFile.content);
          if (textContent.length > 100) {
            transcriptParts.push(`=== ${jsFile.path} (Extracted Text) ===\n\n${textContent}\n`);
          }
        }
      }

      // Extract PDF content
      for (const pdfFile of analysis.contentFiles.pdfs) {
        transcriptParts.push(`=== ${pdfFile.path} (PDF Document) ===\n\n[PDF content - ${(pdfFile.size / 1024).toFixed(2)} KB]\n`);
      }

      // Extract EPUB content
      for (const epubFile of analysis.contentFiles.epubs) {
        transcriptParts.push(`=== ${epubFile.path} (EPUB Document) ===\n\n[EPUB content - ${(epubFile.size / 1024).toFixed(2)} KB]\n`);
      }

      // Extract text files
      for (const textFile of analysis.contentFiles.textContent) {
        if (textFile.content) {
          transcriptParts.push(`=== ${textFile.path} ===\n\n${textFile.content}\n`);
        }
      }

      // Process videos
      for (const video of analysis.contentFiles.videos) {
        transcriptParts.push(`=== ${video.path} (Video) ===\n\n[Video content - ${(video.size / 1024 / 1024).toFixed(2)} MB]\n`);
      }

      // Process audio
      for (const audio of analysis.contentFiles.audio) {
        transcriptParts.push(`=== ${audio.path} (Audio) ===\n\n[Audio content - ${(audio.size / 1024 / 1024).toFixed(2)} MB]\n`);
      }
      
      if (transcriptParts.length > 0) {
        const finalTranscript = transcriptParts.join('\n---\n\n');
        updateTranscript(finalTranscript);
        toast.success(`Generated transcript from ${transcriptParts.length} content item(s)!`);
      } else {
        const placeholderTranscript = `No content found for transcription.\n\nThe SCORM package appears to be empty or contains no extractable content.`;
        updateTranscript(placeholderTranscript);
        toast.info("No content found for transcription");
      }
      
      setGenerating(false);
    } catch (error) {
      console.error("Error generating transcripts:", error);
      toast.error("Failed to generate transcripts: " + (error instanceof Error ? error.message : "Unknown error"));
      setGenerating(false);
    }
  };

  const processStructureItem = async (item: any, analysis: any, transcriptParts: string[]) => {
    if (item.title) {
      transcriptParts.push(`\n## ${item.title}\n`);
    }
    
    // Process children recursively
    if (item.children) {
      for (const child of item.children) {
        await processStructureItem(child, analysis, transcriptParts);
      }
    }
  };

  const cleanAcademicContent = (text: string): string => {
    // Remove common SCORM navigation patterns
    const navigationPatterns = [
      /\b(click|press|tap)\s+(next|previous|back|forward|continue|submit|menu|home|exit)\b/gi,
      /\b(next|previous|back|forward)\s+(page|slide|screen|button)\b/gi,
      /\bnavigation\s+(menu|bar|controls?)\b/gi,
      /\b(start|begin|resume|restart)\s+(course|lesson|module|activity)\b/gi,
      /\bgo\s+to\s+(next|previous|main|home)\b/gi,
      /\b(select|choose)\s+(an?\s+)?(option|answer|choice)\b/gi,
      /\bmenu\s+button\b/gi,
      /\bscorm\s+(player|navigation|controls?)\b/gi,
      /\b(close|minimize|maximize)\s+window\b/gi,
      /\btable\s+of\s+contents\b/gi,
      /\bglossary\b/gi,
      /\bresources?\s+(panel|section)\b/gi,
      /\bhelp\s+(menu|section|button)\b/gi,
    ];

    // Remove button and UI element text patterns
    const uiPatterns = [
      /\[?(button|btn|link|icon|image|video|audio|media)\]?:?\s*/gi,
      /\b(loading|buffering|processing)\.{3}/gi,
      /^\s*(home|menu|next|previous|back|forward|submit|close|exit|help|glossary|resources?|toc)\s*$/gmi,
      /^[<>→←↑↓⇨⇦⇧⇩▶◀▲▼]+$/gm,
      /^\s*[\d]+\s*\/\s*[\d]+\s*$/gm, // Page numbers like "1 / 10"
    ];

    // Remove accessibility and metadata patterns
    const metaPatterns = [
      /\baria-label\b/gi,
      /\balt\s+text\b/gi,
      /\btitle\s+attribute\b/gi,
      /\b(screen|keyboard)\s+reader\b/gi,
      /\bcopyright\s+©/gi,
      /\ball\s+rights\s+reserved\b/gi,
    ];

    let cleaned = text;

    // Apply all cleaning patterns
    [...navigationPatterns, ...uiPatterns, ...metaPatterns].forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // Remove multiple spaces and clean up
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove very short fragments (likely UI elements)
    const lines = cleaned.split(/[.!?]\s+/);
    const meaningfulLines = lines.filter(line => {
      const words = line.trim().split(/\s+/);
      return words.length >= 5; // Keep only sentences with 5+ words
    });

    return meaningfulLines.join('. ').trim();
  };

  const extractTextFromHTML = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script, style, and navigation elements
    doc.querySelectorAll('script, style, noscript, nav, .navigation, .nav-buttons, .controls, #navigation, #controls').forEach(el => el.remove());
    
    // Remove common SCORM UI elements by class/id patterns
    doc.querySelectorAll('[class*="nav"], [class*="menu"], [class*="button"], [id*="nav"], [id*="menu"], [id*="button"]').forEach(el => {
      if (el.textContent && el.textContent.length < 50) { // Only remove short UI elements
        el.remove();
      }
    });
    
    // Get text content
    const text = doc.body?.textContent || '';
    const rawText = text.replace(/\s+/g, ' ').trim();
    
    // Clean academic content
    return cleanAcademicContent(rawText);
  };

  const extractTextFromJS = (js: string): string => {
    // Extract strings from JavaScript
    const stringRegex = /["'`]([^"'`]{20,}?)["'`]/g;
    const matches = [...js.matchAll(stringRegex)];
    const texts = matches.map(m => m[1]).filter(t => {
      // Filter out code-like strings and navigation text
      const lower = t.toLowerCase();
      return !t.includes('function') && 
             !t.includes('return') && 
             !t.includes('=>') &&
             !t.match(/^[a-z]+$/i) && // Skip single words
             !lower.includes('click') &&
             !lower.includes('button') &&
             !lower.includes('navigate') &&
             !lower.includes('menu');
    });
    
    const rawText = texts.join('\n\n');
    return cleanAcademicContent(rawText);
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
              onChange={(e) => updateTranscript(e.target.value)}
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
