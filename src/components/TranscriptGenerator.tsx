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
    // Remove common SCORM navigation patterns - more comprehensive
    const navigationPatterns = [
      /\b(click|press|tap|select|choose|drag|drop)\s+(here|on|the|this|that)?\s*(next|previous|back|forward|continue|submit|menu|home|exit|button|link|icon)\b/gi,
      /\b(next|previous|back|forward|first|last)\s+(page|slide|screen|section|chapter|lesson|module|button|link)\b/gi,
      /\bnavigation\s+(menu|bar|controls?|buttons?|panel|sidebar)\b/gi,
      /\b(start|begin|resume|restart|return|exit|quit|close)\s+(course|lesson|module|activity|quiz|assessment|test|exam)\b/gi,
      /\bgo\s+to\s+(next|previous|main|home|menu|glossary|resources?)\b/gi,
      /\b(select|choose|pick|mark)\s+(an?\s+)?(option|answer|choice|response|item)\b/gi,
      /\bmenu\s+button\b/gi,
      /\bscorm\s+(player|navigation|controls?|api|wrapper|content)\b/gi,
      /\b(close|minimize|maximize|expand|collapse)\s+(window|panel|section|menu)\b/gi,
      /\btable\s+of\s+contents\b/gi,
      /\bresources?\s+(panel|section|library|center)\b/gi,
      /\bhelp\s+(menu|section|button|center|desk)\b/gi,
      /\b(feedback|hint|explanation)\s+will\s+(appear|display|show)\b/gi,
      /\b(correct|incorrect|right|wrong)\s+answer\b/gi,
      /\byour\s+(score|progress|completion|results?)\b/gi,
    ];

    // Remove button and UI element text patterns - more aggressive
    const uiPatterns = [
      /\[?(button|btn|link|hyperlink|icon|image|video|audio|media|graphic)\]?:?\s*/gi,
      /\b(loading|buffering|processing|please\s+wait)\.{3}/gi,
      /^\s*(home|menu|next|previous|back|forward|submit|close|exit|help|glossary|resources?|toc|contents?|index)\s*$/gmi,
      /^[<>→←↑↓⇨⇦⇧⇩▶◀▲▼»«]+$/gm,
      /^\s*[\d]+\s*[\/\\-]\s*[\d]+\s*$/gm, // Page numbers
      /^\s*page\s+\d+\s+(of\s+\d+)?\s*$/gmi,
      /^\s*slide\s+\d+\s*$/gmi,
      /\bclick\s+(here|this|the\s+button|the\s+link)\b/gi,
      /\b(view|see|check|review)\s+(more|details?|information)\b/gi,
      /\b(scroll\s+down|scroll\s+up|swipe|hover)\b/gi,
    ];

    // Remove accessibility and metadata patterns
    const metaPatterns = [
      /\baria-[a-z]+\b/gi,
      /\balt\s+text\b/gi,
      /\btitle\s+attribute\b/gi,
      /\b(screen|keyboard)\s+reader\b/gi,
      /\bcopyright\s+[©Ⓒ]/gi,
      /\ball\s+rights\s+reserved\b/gi,
      /\bpowered\s+by\b/gi,
      /\bversion\s+\d+/gi,
    ];

    let cleaned = text;

    // Apply all cleaning patterns
    [...navigationPatterns, ...uiPatterns, ...metaPatterns].forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // Remove multiple spaces and clean up
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Split into sentences and filter
    const sentences = cleaned.split(/[.!?]+\s+/);
    const meaningfulSentences = sentences.filter(sentence => {
      const words = sentence.trim().split(/\s+/);
      
      // Must have at least 8 words for academic content
      if (words.length < 8) return false;
      
      // Must have some educational indicators
      const hasEducationalWords = /\b(is|are|was|were|will|can|may|must|should|the|this|that|these|those|when|where|why|how|what|because|therefore|however|although|since|while)\b/i.test(sentence);
      
      return hasEducationalWords;
    });

    return meaningfulSentences.join('. ').trim() + (meaningfulSentences.length > 0 ? '.' : '');
  };

  const extractTextFromHTML = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script, style, and navigation elements
    doc.querySelectorAll('script, style, noscript, nav, header, footer, aside, .navigation, .nav-buttons, .controls, #navigation, #controls, [role="navigation"], [aria-label*="navigation"], [aria-label*="menu"]').forEach(el => el.remove());
    
    // Remove common SCORM UI elements by class/id patterns - be more aggressive
    doc.querySelectorAll('[class*="nav"], [class*="menu"], [class*="button"], [class*="btn"], [class*="control"], [class*="toolbar"], [id*="nav"], [id*="menu"], [id*="button"], [id*="control"], button, input, select, textarea').forEach(el => el.remove());
    
    // Focus on main content areas
    const mainContent = doc.querySelector('main, article, [role="main"], .content, #content, .main, #main');
    const text = mainContent?.textContent || doc.body?.textContent || '';
    
    // Remove HTML entities and normalize whitespace
    const rawText = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Clean academic content
    return cleanAcademicContent(rawText);
  };

  const extractTextFromJS = (js: string): string => {
    // Extract strings from JavaScript - focus on learning content
    const stringRegex = /["'`]([^"'`]{30,500})["'`]/g; // Longer strings (30-500 chars) are more likely to be content
    const matches = [...js.matchAll(stringRegex)];
    const texts = matches.map(m => m[1]).filter(t => {
      const lower = t.toLowerCase();
      
      // Skip code-like strings
      if (t.includes('function') || t.includes('return') || t.includes('=>') || t.includes('var ') || t.includes('const ') || t.includes('let ')) {
        return false;
      }
      
      // Skip URLs and paths
      if (t.includes('http') || t.includes('://') || t.includes('.com') || t.includes('.js') || t.includes('.css')) {
        return false;
      }
      
      // Skip navigation/UI text
      if (lower.includes('click') || lower.includes('button') || lower.includes('navigate') || 
          lower.includes('menu') || lower.includes('next page') || lower.includes('previous') ||
          lower.includes('submit') || lower.includes('cancel')) {
        return false;
      }
      
      // Keep only educational content indicators
      const hasEducationalIndicators = /\b(learn|understand|concept|theory|practice|example|definition|explain|describe|analyze|demonstrate)\b/i.test(t);
      const hasMultipleSentences = (t.match(/[.!?]/g) || []).length >= 2;
      
      return hasEducationalIndicators || hasMultipleSentences;
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
