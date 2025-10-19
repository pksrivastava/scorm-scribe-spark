import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Maximize } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";
import { toast } from "sonner";

interface ScormPlayerProps {
  file: File;
}

export const ScormPlayer = ({ file }: ScormPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scormContent, setScormContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const extractScorm = async () => {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        
        // Look for imsmanifest.xml
        const manifestFile = contents.file("imsmanifest.xml");
        if (manifestFile) {
          const manifestContent = await manifestFile.async("string");
          console.log("SCORM Manifest loaded");
          
          // Find the main entry point
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(manifestContent, "text/xml");
          const resources = xmlDoc.getElementsByTagName("resource");
          
          if (resources.length > 0) {
            const href = resources[0].getAttribute("href");
            if (href) {
              const entryFile = contents.file(href);
              if (entryFile) {
                const content = await entryFile.async("string");
                setScormContent(content);
              }
            }
          }
        }
        
        setLoading(false);
        toast.success("SCORM package loaded successfully");
      } catch (error) {
        console.error("Error extracting SCORM:", error);
        toast.error("Failed to load SCORM package");
        setLoading(false);
      }
    };

    extractScorm();
  }, [file]);

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
          {loading ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading SCORM content...</p>
            </div>
          ) : scormContent ? (
            <iframe
              srcDoc={scormContent}
              className="w-full h-full"
              title="SCORM Content"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="text-center">
              <Play className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">SCORM player ready</p>
            </div>
          )}
        </div>

        {/* Player Controls */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                onClick={() => setIsPlaying(!isPlaying)}
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

            <Button variant="outline" size="icon">
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
