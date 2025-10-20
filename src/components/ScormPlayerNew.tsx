import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Maximize, Download, Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import JSZip from "jszip";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { analyzeScormPackage } from "@/utils/scormAnalyzer";
import { ScormAnalysisReport } from "./ScormAnalysisReport";
import type { ScormAnalysis } from "@/utils/scormAnalyzer";

interface ScormPlayerNewProps {
  file: File;
  onCaptureComplete?: (data: any) => void;
}

export const ScormPlayerNew = ({ file, onCaptureComplete }: ScormPlayerNewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scormData, setScormData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<ScormAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedScreenshots, setCapturedScreenshots] = useState<string[]>([]);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeScorm();
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [file]);

  const initializeScorm = async () => {
    try {
      setIsLoading(true);
      
      // Analyze the package
      const packageAnalysis = await analyzeScormPackage(file);
      setAnalysis(packageAnalysis);
      
      // Extract and prepare SCORM content
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Find the entry point
      const entryPoint = packageAnalysis.entryPoints[0] || 'index.html';
      
      // Get the entry file
      const entryFile = contents.file(entryPoint);
      if (!entryFile) {
        throw new Error(`Entry point ${entryPoint} not found`);
      }
      
      // Create blob URLs for all files
      const blobUrls: { [key: string]: string } = {};
      
      for (const [filename, fileObj] of Object.entries(contents.files)) {
        if (!fileObj.dir) {
          const blob = await fileObj.async('blob');
          blobUrls[filename] = URL.createObjectURL(blob);
        }
      }
      
      // Load entry HTML and replace paths
      let entryHtml = await entryFile.async('string');
      
      // Replace relative paths with blob URLs
      Object.keys(blobUrls).forEach(filename => {
        const path = filename.replace(/\\/g, '/');
        entryHtml = entryHtml.replace(new RegExp(path, 'g'), blobUrls[filename]);
        entryHtml = entryHtml.replace(new RegExp(filename, 'g'), blobUrls[filename]);
      });
      
      // Inject SCORM API
      const scormApiScript = `
        <script>
          // SCORM 1.2 API
          window.API = {
            LMSInitialize: function(param) { 
              console.log('SCORM: LMSInitialize', param); 
              return "true"; 
            },
            LMSFinish: function(param) { 
              console.log('SCORM: LMSFinish', param); 
              return "true"; 
            },
            LMSGetValue: function(element) { 
              console.log('SCORM: LMSGetValue', element);
              if (element === "cmi.core.lesson_status") return "incomplete";
              if (element === "cmi.core.student_id") return "student_001";
              if (element === "cmi.core.student_name") return "Test Student";
              return ""; 
            },
            LMSSetValue: function(element, value) { 
              console.log('SCORM: LMSSetValue', element, value);
              window.parent.postMessage({ 
                type: 'scorm-data', 
                element, 
                value 
              }, '*');
              return "true"; 
            },
            LMSCommit: function(param) { 
              console.log('SCORM: LMSCommit', param); 
              return "true"; 
            },
            LMSGetLastError: function() { return "0"; },
            LMSGetErrorString: function(errorCode) { return "No error"; },
            LMSGetDiagnostic: function(errorCode) { return "No error"; }
          };
          
          // SCORM 2004 API
          window.API_1484_11 = {
            Initialize: function(param) { 
              console.log('SCORM 2004: Initialize', param); 
              return "true"; 
            },
            Terminate: function(param) { 
              console.log('SCORM 2004: Terminate', param); 
              return "true"; 
            },
            GetValue: function(element) { 
              console.log('SCORM 2004: GetValue', element);
              if (element === "cmi.completion_status") return "incomplete";
              if (element === "cmi.learner_id") return "student_001";
              if (element === "cmi.learner_name") return "Test Student";
              return ""; 
            },
            SetValue: function(element, value) { 
              console.log('SCORM 2004: SetValue', element, value);
              window.parent.postMessage({ 
                type: 'scorm-data', 
                element, 
                value 
              }, '*');
              return "true"; 
            },
            Commit: function(param) { 
              console.log('SCORM 2004: Commit', param); 
              return "true"; 
            },
            GetLastError: function() { return "0"; },
            GetErrorString: function(errorCode) { return "No error"; },
            GetDiagnostic: function(errorCode) { return "No error"; }
          };
          
          console.log('SCORM APIs initialized');
        </script>
      `;
      
      // Inject at the start of head or body
      if (entryHtml.includes('<head>')) {
        entryHtml = entryHtml.replace('<head>', '<head>' + scormApiScript);
      } else if (entryHtml.includes('<body>')) {
        entryHtml = entryHtml.replace('<body>', scormApiScript + '<body>');
      } else {
        entryHtml = scormApiScript + entryHtml;
      }
      
      setScormData({
        html: entryHtml,
        blobUrls,
        analysis: packageAnalysis
      });
      
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
    // Listen for SCORM data from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'scorm-data') {
        console.log('SCORM Data received:', event.data);
        onCaptureComplete?.({
          timestamp: Date.now(),
          element: event.data.element,
          value: event.data.value
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCaptureComplete]);

  const captureScreenshot = async () => {
    if (!iframeRef.current) return;
    
    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (!iframeDoc) {
        toast.error('Cannot access iframe content');
        return;
      }

      const canvas = await html2canvas(iframeDoc.body, {
        allowTaint: true,
        useCORS: true,
        logging: false
      });
      
      const screenshot = canvas.toDataURL('image/png');
      setCapturedScreenshots(prev => [...prev, screenshot]);
      
      return screenshot;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error('Failed to capture screenshot');
    }
  };

  const startCapture = () => {
    setIsCapturing(true);
    toast.info('Started capturing screenshots every 2 seconds');
    
    captureIntervalRef.current = setInterval(() => {
      captureScreenshot();
    }, 2000);
  };

  const stopCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsCapturing(false);
    toast.success(`Captured ${capturedScreenshots.length} screenshots`);
  };

  const downloadScreenshots = () => {
    capturedScreenshots.forEach((screenshot, idx) => {
      const link = document.createElement('a');
      link.href = screenshot;
      link.download = `scorm-capture-${idx + 1}.png`;
      link.click();
    });
    toast.success('Downloaded all screenshots');
  };

  const resetPlayer = () => {
    setIsPlaying(false);
    setCapturedScreenshots([]);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing SCORM package...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
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
                onClick={() => setIsPlaying(!isPlaying)}
                className="gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <Button onClick={resetPlayer} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              
              <Button
                onClick={isCapturing ? stopCapture : startCapture}
                variant={isCapturing ? "destructive" : "secondary"}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {isCapturing ? 'Stop Capture' : 'Start Capture'}
              </Button>
            </div>
            
            {capturedScreenshots.length > 0 && (
              <Button onClick={downloadScreenshots} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download Screenshots ({capturedScreenshots.length})
              </Button>
            )}
          </div>

          {/* Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {scormData && (
              <iframe
                ref={iframeRef}
                srcDoc={scormData.html}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                title="SCORM Content"
              />
            )}
          </div>

          {/* Captured Screenshots Preview */}
          {capturedScreenshots.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-sm">Captured Screenshots</h4>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {capturedScreenshots.map((screenshot, idx) => (
                  <img
                    key={idx}
                    src={screenshot}
                    alt={`Capture ${idx + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
