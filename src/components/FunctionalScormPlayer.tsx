import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Download, Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import JSZip from "jszip";
import { toast } from "sonner";
import { Scorm12API, Scorm2004API } from 'scorm-again';
import { analyzeScormPackage, type ScormAnalysis } from "@/utils/scormAnalyzer";
import { ScormAnalysisReport } from "./ScormAnalysisReport";

interface FunctionalScormPlayerProps {
  file: File;
  onDataCapture?: (data: any) => void;
}

export const FunctionalScormPlayer = ({ file, onDataCapture }: FunctionalScormPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScormAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [scormData, setScormData] = useState<Map<string, any>>(new Map());
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scormAPIRef = useRef<any>(null);

  useEffect(() => {
    initializeScorm();
    return () => {
      // Cleanup blob URLs
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl);
      }
    };
  }, [file]);

  const initializeScorm = async () => {
    try {
      setIsLoading(true);
      
      // Analyze package
      const packageAnalysis = await analyzeScormPackage(file);
      setAnalysis(packageAnalysis);
      
      // Extract ZIP
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Find entry point
      const entryPoint = packageAnalysis.entryPoints[0];
      if (!entryPoint) {
        throw new Error("No entry point found in SCORM package");
      }

      // Create blob URLs for all files
      const fileMap = new Map<string, string>();
      const promises: Promise<void>[] = [];

      contents.forEach((relativePath, file) => {
        if (!file.dir) {
          promises.push(
            file.async('blob').then(blob => {
              const url = URL.createObjectURL(blob);
              fileMap.set(relativePath, url);
            })
          );
        }
      });

      await Promise.all(promises);

      // Get entry file
      const entryFile = contents.file(entryPoint);
      if (!entryFile) {
        throw new Error(`Entry point ${entryPoint} not found`);
      }

      let html = await entryFile.async('string');

      // Replace all relative paths with blob URLs
      fileMap.forEach((blobUrl, path) => {
        // Handle various path formats
        const patterns = [
          new RegExp(`src=["']${path}["']`, 'gi'),
          new RegExp(`href=["']${path}["']`, 'gi'),
          new RegExp(`url\\(["']?${path}["']?\\)`, 'gi'),
        ];
        
        patterns.forEach(pattern => {
          html = html.replace(pattern, (match) => {
            if (match.includes('src=')) return `src="${blobUrl}"`;
            if (match.includes('href=')) return `href="${blobUrl}"`;
            return `url(${blobUrl})`;
          });
        });
      });

      // Initialize SCORM API based on version
      const isScorm2004 = packageAnalysis.version === 'SCORM 2004';
      
      if (isScorm2004) {
        scormAPIRef.current = new Scorm2004API({
          autocommit: true,
          autocommitSeconds: 10,
          logLevel: 1
        });
      } else {
        scormAPIRef.current = new Scorm12API({
          autocommit: true,
          autocommitSeconds: 10,
          logLevel: 1
        });
      }

      // Listen to SCORM data changes
      scormAPIRef.current.on('SetValue.cmi.*', (CMIElement: string, value: any) => {
        console.log('SCORM Data:', CMIElement, value);
        setScormData(prev => new Map(prev).set(CMIElement, value));
        onDataCapture?.({ element: CMIElement, value, timestamp: Date.now() });
      });

      // Inject SCORM API into iframe
      const scormScript = `
        <script>
          // Make SCORM API available to content
          window.API = ${isScorm2004 ? 'null' : 'parent.scormAPI'};
          window.API_1484_11 = ${isScorm2004 ? 'parent.scormAPI' : 'null'};
          
          console.log('SCORM API injected:', window.API || window.API_1484_11);
        </script>
      `;

      // Inject script at the beginning of head or body
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${scormScript}`);
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', `${scormScript}<body>`);
      } else {
        html = scormScript + html;
      }

      // Create final blob
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setContentUrl(url);

      setIsLoading(false);
      toast.success('SCORM package loaded successfully!');
      
    } catch (error) {
      console.error('Error initializing SCORM:', error);
      setError(error instanceof Error ? error.message : 'Failed to load SCORM package');
      toast.error('Failed to load SCORM package');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Make SCORM API available to iframe
    if (scormAPIRef.current && iframeRef.current) {
      (iframeRef.current.contentWindow as any).scormAPI = scormAPIRef.current;
    }
  }, [contentUrl]);

  const handlePlay = () => {
    setIsPlaying(true);
    if (scormAPIRef.current) {
      const initMethod = scormAPIRef.current.lmsInitialize || scormAPIRef.current.Initialize;
      if (initMethod) {
        initMethod.call(scormAPIRef.current, '');
      }
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    if (iframeRef.current && contentUrl) {
      iframeRef.current.src = contentUrl;
      setIsPlaying(false);
      setScormData(new Map());
      
      if (scormAPIRef.current) {
        scormAPIRef.current.reset();
      }
    }
  };

  const downloadScormData = () => {
    const data = Object.fromEntries(scormData);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scorm-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('SCORM data downloaded');
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SCORM package...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {analysis && <ScormAnalysisReport analysis={analysis} />}
      
      <Card className="p-6">
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={isPlaying ? handlePause : handlePlay}
                className="gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
            
            {scormData.size > 0 && (
              <Button onClick={downloadScormData} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download Data ({scormData.size})
              </Button>
            )}
          </div>

          {/* Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {contentUrl && (
              <iframe
                ref={iframeRef}
                src={contentUrl}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                title="SCORM Content"
              />
            )}
          </div>

          {/* SCORM Data Display */}
          {scormData.size > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-sm">SCORM Data Captured</h4>
              <div className="bg-muted/50 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs">
                  {JSON.stringify(Object.fromEntries(scormData), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
