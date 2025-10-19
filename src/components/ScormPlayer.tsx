import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Maximize, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import JSZip from "jszip";
import { toast } from "sonner";

interface ScormPlayerProps {
  file: File;
}

export const ScormPlayer = ({ file }: ScormPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scormData, setScormData] = useState<{
    entryPoint: string;
    title: string;
    structure: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zipFiles, setZipFiles] = useState<JSZip | null>(null);

  useEffect(() => {
    const extractScorm = async () => {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        setZipFiles(contents);
        
        // Look for imsmanifest.xml
        const manifestFile = contents.file("imsmanifest.xml");
        if (!manifestFile) {
          throw new Error("No imsmanifest.xml found - this may not be a valid SCORM package");
        }

        const manifestContent = await manifestFile.async("string");
        console.log("SCORM Manifest loaded successfully");
        
        // Parse manifest
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(manifestContent, "text/xml");
        
        // Check for parsing errors
        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
          throw new Error("Invalid manifest XML");
        }

        // Get course title
        const titleElement = xmlDoc.querySelector("organizations > organization > title");
        const title = titleElement?.textContent || "SCORM Course";

        // Get all items in order
        const items = Array.from(xmlDoc.querySelectorAll("organizations > organization > item"));
        const structure = items.map((item, idx) => ({
          identifier: item.getAttribute("identifier") || `item-${idx}`,
          title: item.querySelector("title")?.textContent || `Item ${idx + 1}`,
          identifierref: item.getAttribute("identifierref")
        }));

        // Find the first resource entry point
        const resources = xmlDoc.getElementsByTagName("resource");
        let entryPoint = "";
        
        if (resources.length > 0) {
          const href = resources[0].getAttribute("href");
          if (href) {
            entryPoint = href;
          }
        }

        if (!entryPoint) {
          throw new Error("No entry point found in manifest");
        }

        setScormData({ entryPoint, title, structure });
        setLoading(false);
        toast.success("SCORM package loaded successfully");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to load SCORM package";
        console.error("Error extracting SCORM:", error);
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
      }
    };

    extractScorm();
  }, [file]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {scormData && (
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <h3 className="font-semibold text-lg mb-2">{scormData.title}</h3>
          <p className="text-sm text-muted-foreground">
            {scormData.structure.length} item(s) • Entry: {scormData.entryPoint}
          </p>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
          {loading ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading SCORM content...</p>
            </div>
          ) : scormData ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <div className="text-center space-y-4 p-8">
                <Play className="w-16 h-16 text-primary mx-auto mb-4" />
                <div>
                  <h4 className="font-semibold text-lg mb-2">SCORM Content Detected</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Entry file: <code className="bg-muted px-2 py-1 rounded">{scormData.entryPoint}</code>
                  </p>
                  <Alert className="text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Note:</strong> Full SCORM playback requires a SCORM-compliant player with LMS integration.
                      Use the other tabs to extract content (videos, transcripts, assessments) from this package.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Play className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content loaded</p>
            </div>
          )}
        </div>

        {/* Course Structure */}
        {scormData && scormData.structure.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Course Structure:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {scormData.structure.map((item, idx) => (
                <div key={idx} className="p-2 bg-muted/50 rounded text-sm hover:bg-muted transition-colors">
                  <span className="font-medium">{idx + 1}. {item.title}</span>
                  {item.identifierref && (
                    <span className="text-xs text-muted-foreground ml-2">({item.identifierref})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simplified Controls */}
        <div className="mt-4 space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setProgress(Math.max(0, progress - 10))}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              size="icon"
              className="w-12 h-12 bg-gradient-to-br from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isPlaying && progress < 100) {
                  const interval = setInterval(() => {
                    setProgress(prev => {
                      if (prev >= 100) {
                        clearInterval(interval);
                        setIsPlaying(false);
                        return 100;
                      }
                      return prev + 1;
                    });
                  }, 100);
                }
              }}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
            
            <Button
              size="icon"
              variant="outline"
              onClick={() => setProgress(Math.min(100, progress + 10))}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
