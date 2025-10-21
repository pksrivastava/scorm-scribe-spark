import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileArchive, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeScormPackage } from "@/utils/scormAnalyzer";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'complete' | 'error';
  progress: number;
  error?: string;
  jobId?: string;
}

interface BulkScormUploaderProps {
  onComplete?: (jobIds: string[]) => void;
}

export const BulkScormUploader = ({ onComplete }: BulkScormUploaderProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const zipFiles = selectedFiles.filter(f => f.name.endsWith('.zip'));
    
    if (zipFiles.length !== selectedFiles.length) {
      toast.error('Only ZIP files are supported');
    }

    const newFiles: UploadedFile[] = zipFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${zipFiles.length} file(s) to queue`);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to process');
      return;
    }

    setIsProcessing(true);
    const jobIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'uploading', progress: 10 } : f
        ));

        // Upload to Supabase Storage
        const filePath = `${Date.now()}-${fileData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('scorm-packages')
          .upload(filePath, fileData.file);

        if (uploadError) throw uploadError;

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, progress: 40 } : f
        ));

        // Analyze package
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'analyzing', progress: 60 } : f
        ));

        const analysis = await analyzeScormPackage(fileData.file);

        // Create job record
        const { data: job, error: jobError } = await supabase
          .from('scorm_jobs')
          .insert([{
            filename: fileData.file.name,
            status: 'completed',
            video_count: analysis.contentFiles.videos.length,
            assessment_count: analysis.assessments.length,
            metadata: {
              analysis: JSON.parse(JSON.stringify(analysis)),
              storage_path: filePath
            }
          }])
          .select()
          .single();

        if (jobError) throw jobError;

        jobIds.push(job.id);

        // Mark as complete
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'complete', progress: 100, jobId: job.id } 
            : f
        ));

        toast.success(`Processed: ${fileData.file.name}`);

      } catch (error) {
        console.error('Error processing file:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Processing failed' 
              } 
            : f
        ));
        toast.error(`Failed to process: ${fileData.file.name}`);
      }
    }

    setIsProcessing(false);
    
    if (jobIds.length > 0) {
      toast.success(`Successfully processed ${jobIds.length} file(s)`);
      onComplete?.(jobIds);
    }
  };

  const overallProgress = files.length > 0
    ? files.reduce((sum, f) => sum + f.progress, 0) / files.length
    : 0;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Bulk SCORM Upload</h3>
          <p className="text-sm text-muted-foreground">
            Upload multiple SCORM packages for batch processing
          </p>
        </div>

        {/* File Input */}
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              multiple
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              disabled={isProcessing}
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
            >
              <Upload className="w-4 h-4" />
              Select SCORM Files (.zip)
            </Button>
          </label>
          
          {files.length > 0 && (
            <Button
              onClick={processFiles}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Process All ({files.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Overall Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} />
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Upload Queue ({files.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((fileData) => (
                <div
                  key={fileData.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {fileData.status === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : fileData.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    ) : fileData.status === 'pending' ? (
                      <FileArchive className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileData.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs capitalize">{fileData.status}</p>
                    </div>
                    {fileData.error && (
                      <p className="text-xs text-destructive mt-1">{fileData.error}</p>
                    )}
                    {fileData.status !== 'pending' && fileData.status !== 'complete' && fileData.status !== 'error' && (
                      <Progress value={fileData.progress} className="h-1 mt-2" />
                    )}
                  </div>

                  {fileData.status === 'pending' && !isProcessing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
