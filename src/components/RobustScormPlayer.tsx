import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";
import { toast } from "sonner";
import { Scorm12API, Scorm2004API } from 'scorm-again';
import { analyzeScormPackage, type ScormAnalysis } from "@/utils/scormAnalyzer";
import { ScormAnalysisReport } from "./ScormAnalysisReport";

interface RobustScormPlayerProps {
  file: File;
  onDataCapture?: (data: any) => void;
}

export const RobustScormPlayer = ({ file, onDataCapture }: RobustScormPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScormAnalysis | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [scormData, setScormData] = useState<any>({});
  const [loadProgress, setLoadProgress] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scormAPIRef = useRef<any>(null);
  const contentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    initializeScormPlayer();
    return () => {
      // Cleanup
      if (contentUrlRef.current) {
        URL.revokeObjectURL(contentUrlRef.current);
      }
    };
  }, [file]);

  const initializeScormPlayer = async () => {
    try {
      setIsLoading(true);
      setLoadProgress(10);
      
      // Analyze package first
      const packageAnalysis = await analyzeScormPackage(file);
      setAnalysis(packageAnalysis);
      setLoadProgress(30);
      
      // Determine SCORM version
      const isScorm2004 = packageAnalysis.version.includes('2004');
      console.log('SCORM Version:', packageAnalysis.version);
      
      // Initialize appropriate SCORM API
      if (isScorm2004) {
        scormAPIRef.current = new Scorm2004API({
          autocommit: true,
          autocommitSeconds: 10,
          logLevel: 4
        });
        
        // Make API available globally for iframe
        (window as any).API_1484_11 = scormAPIRef.current;
        console.log('SCORM 2004 API initialized and exposed globally');
      } else {
        scormAPIRef.current = new Scorm12API({
          autocommit: true,
          autocommitSeconds: 10,
          logLevel: 4
        });
        
        // Make API available globally for iframe
        (window as any).API = scormAPIRef.current;
        console.log('SCORM 1.2 API initialized and exposed globally');
      }

      // Listen to all SCORM API calls
      scormAPIRef.current.on('SetValue.cmi.*', (CMIElement: string, value: any) => {
        console.log('SCORM SetValue:', CMIElement, '=', value);
        setScormData((prev: any) => ({ ...prev, [CMIElement]: value }));
        onDataCapture?.({ element: CMIElement, value, timestamp: Date.now() });
      });

      scormAPIRef.current.on('GetValue.cmi.*', (CMIElement: string) => {
        console.log('SCORM GetValue:', CMIElement);
      });

      setLoadProgress(50);
      
      // Extract and prepare SCORM content
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      setLoadProgress(70);
      
      // Find entry point
      const entryPoint = packageAnalysis.entryPoints[0];
      if (!entryPoint) {
        throw new Error("No entry point found in SCORM package");
      }
      console.log('Entry point:', entryPoint);

      // Get entry file
      const entryFile = contents.file(entryPoint);
      if (!entryFile) {
        throw new Error(`Entry point ${entryPoint} not found`);
      }

      // Create a map of all files with blob URLs
      const fileMap = new Map<string, string>();
      const filePromises: Promise<void>[] = [];

      contents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          filePromises.push(
            zipEntry.async('blob').then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              fileMap.set(relativePath, blobUrl);
              // Also map without leading slash
              fileMap.set(relativePath.replace(/^\//, ''), blobUrl);
            })
          );
        }
      });

      await Promise.all(filePromises);
      setLoadProgress(85);

      // Load entry HTML
      let html = await entryFile.async('string');

      // Replace all resource references with blob URLs
      fileMap.forEach((blobUrl, path) => {
        // Create various path patterns to match
        const patterns = [
          // src and href attributes
          new RegExp(`(src|href)=["']${path}["']`, 'gi'),
          new RegExp(`(src|href)=["']\./${path}["']`, 'gi'),
          new RegExp(`(src|href)=["']\.\./${path}["']`, 'gi'),
          // CSS url()
          new RegExp(`url\\(["']?${path}["']?\\)`, 'gi'),
          new RegExp(`url\\(["']?\./${path}["']?\\)`, 'gi'),
        ];

        patterns.forEach(pattern => {
          html = html.replace(pattern, (match) => {
            if (match.includes('src=')) return `src="${blobUrl}"`;
            if (match.includes('href=')) return `href="${blobUrl}"`;
            if (match.includes('url(')) return `url(${blobUrl})`;
            return match;
          });
        });
      });

      // Add base tag to help with relative paths
      const baseTag = `<base href="${URL.createObjectURL(new Blob([''], { type: 'text/html' }))}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      }

      // Inject script to find SCORM API in parent
      const apiFinderScript = `
        <script>
          console.log('SCORM content loaded, searching for API...');
          
          // Function to find SCORM API
          function findAPI(win) {
            let attempts = 0;
            const maxAttempts = 20;
            
            while (win && attempts < maxAttempts) {
              // Check for SCORM 2004
              if (win.API_1484_11) {
                console.log('Found SCORM 2004 API at level', attempts);
                window.API_1484_11 = win.API_1484_11;
                return win.API_1484_11;
              }
              
              // Check for SCORM 1.2
              if (win.API) {
                console.log('Found SCORM 1.2 API at level', attempts);
                window.API = win.API;
                return win.API;
              }
              
              // Try parent
              if (win.parent && win.parent !== win) {
                win = win.parent;
                attempts++;
              } else {
                break;
              }
            }
            
            console.error('SCORM API not found after', attempts, 'attempts');
            return null;
          }
          
          // Find and expose API
          const api = findAPI(window);
          if (api) {
            console.log('SCORM API successfully connected');
          } else {
            console.error('Failed to connect to SCORM API');
          }
        </script>
      `;

      // Inject at the start of head or body
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${apiFinderScript}`);
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', `${apiFinderScript}<body>`);
      } else {
        html = apiFinderScript + html;
      }

      // Create final blob and URL
      const finalBlob = new Blob([html], { type: 'text/html' });
      contentUrlRef.current = URL.createObjectURL(finalBlob);

      setLoadProgress(100);
      setIsLoading(false);
      toast.success('SCORM package loaded successfully!');
      
    } catch (error) {
      console.error('Error initializing SCORM:', error);
      setError(error instanceof Error ? error.message : 'Failed to load SCORM package');
      toast.error('Failed to load SCORM package');
      setIsLoading(false);
    }
  };

  const handleInitialize = () => {
    if (scormAPIRef.current && !isInitialized) {
      const initMethod = scormAPIRef.current.lmsInitialize || scormAPIRef.current.Initialize;
      if (initMethod) {
        const result = initMethod.call(scormAPIRef.current, '');
        console.log('SCORM Initialize result:', result);
        setIsInitialized(true);
        toast.success('SCORM session initialized');
      }
    }
  };

  const handleReset = () => {
    if (scormAPIRef.current) {
      scormAPIRef.current.reset();
      setScormData({});
      setIsInitialized(false);
    }
    
    if (iframeRef.current && contentUrlRef.current) {
      iframeRef.current.src = contentUrlRef.current;
    }
    
    toast.info('SCORM player reset');
  };

  const downloadScormData = () => {
    const dataStr = JSON.stringify(scormData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scorm-data-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('SCORM data downloaded');
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading SCORM package...</p>
          <Progress value={loadProgress} className="w-full" />
          <p className="text-sm text-muted-foreground">{loadProgress}%</p>
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
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium">
                {isInitialized ? 'SCORM Session Active' : 'Ready to Start'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {Object.keys(scormData).length} data points captured
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!isInitialized && (
                <Button onClick={handleInitialize} className="gap-2">
                  <Play className="w-4 h-4" />
                  Start SCORM
                </Button>
              )}
              
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
            
            {Object.keys(scormData).length > 0 && (
              <Button onClick={downloadScormData} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Data ({Object.keys(scormData).length})
              </Button>
            )}
          </div>

          {/* SCORM Content Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
            {contentUrlRef.current && (
              <iframe
                ref={iframeRef}
                src={contentUrlRef.current}
                className="w-full h-full"
                title="SCORM Content"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                allow="autoplay; fullscreen"
              />
            )}
          </div>

          {/* SCORM Data Display */}
          {Object.keys(scormData).length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-sm">Captured SCORM Data</h4>
              <div className="bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                <pre className="text-xs font-mono">
                  {JSON.stringify(scormData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
