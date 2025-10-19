import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileVideo, Film } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ExportOptionsProps {
  file: File;
}

export const ExportOptions = ({ file }: ExportOptionsProps) => {
  const [format, setFormat] = useState("mp4");
  const [quality, setQuality] = useState("high");
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const startConversion = async () => {
    setConverting(true);
    setProgress(0);
    
    toast.info("SCORM to video conversion requires server-side processing...");

    // Simulate progress for demonstration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    // After progress reaches 90%, show info message
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setConverting(false);
      
      toast.info(
        `SCORM to ${format.toUpperCase()} conversion requires:\n` +
        "1. Video recording tools (Puppeteer, Playwright)\n" +
        "2. FFmpeg for encoding\n" +
        "3. Server infrastructure\n\n" +
        "Consider using cloud services or dedicated SCORM conversion tools for production use.",
        { duration: 10000 }
      );
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <FileVideo className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Export Format</h3>
            <p className="text-sm text-muted-foreground">
              Convert SCORM content to video format
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Output Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                <RadioGroupItem value="mp4" id="mp4" />
                <Label htmlFor="mp4" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    <span className="font-medium">MP4</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Universal compatibility
                    </span>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                <RadioGroupItem value="hls" id="hls" />
                <Label htmlFor="hls" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileVideo className="w-4 h-4" />
                    <span className="font-medium">HLS</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Adaptive streaming
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Quality</Label>
            <RadioGroup value={quality} onValueChange={setQuality}>
              <div className="grid grid-cols-3 gap-3">
                {["low", "medium", "high"].map((q) => (
                  <div
                    key={q}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <RadioGroupItem value={q} id={q} />
                    <Label htmlFor={q} className="flex-1 cursor-pointer capitalize">
                      {q}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {converting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Converting...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button
            onClick={startConversion}
            disabled={converting}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent"
            size="lg"
          >
            {converting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Start Conversion
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
