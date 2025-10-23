import { useState } from "react";
import { Upload, Video, FileText, MessageSquare, Play, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadSection } from "@/components/UploadSection";
import { VideoExtractor } from "@/components/VideoExtractor";
import { TranscriptGenerator } from "@/components/TranscriptGenerator";
import { AssessmentExtractor } from "@/components/AssessmentExtractor";
import { RobustScormPlayer } from "@/components/RobustScormPlayer";
import { BulkScormUploader } from "@/components/BulkScormUploader";
import { ExportOptions } from "@/components/ExportOptions";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateAndRepairScormPackage, type RepairResult } from "@/utils/scormPackageRepair";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [scormFile, setScormFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    setIsValidating(true);
    toast.info("Validating SCORM package...");
    
    try {
      const result = await validateAndRepairScormPackage(file);
      setRepairResult(result);
      
      if (result.repairedFile) {
        setScormFile(result.repairedFile);
        toast.success(`Package repaired with ${result.fixes.length} fix(es)`);
      } else if (result.success) {
        setScormFile(file);
        toast.success("SCORM package validated successfully");
      } else {
        setScormFile(file);
        toast.warning("Package loaded with issues - player may not work correctly");
      }

      // Create processing job in database
      const finalFile = result.repairedFile || file;
      const { data, error } = await supabase
        .from('scorm_jobs')
        .insert({
          filename: finalFile.name,
          status: 'processing',
          metadata: { 
            size: finalFile.size, 
            type: finalFile.type,
            repaired: !!result.repairedFile,
            issues: result.issues,
            fixes: result.fixes
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating job:', error);
        toast.error('Failed to create processing job');
      } else if (data) {
        setJobId(data.id);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setScormFile(file);
      toast.error("Validation failed, loading package anyway");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Video className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  SCORM Toolkit
                </h1>
                <p className="text-sm text-muted-foreground">Professional Content Processing Platform</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export All
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/developer'}>
              Developer API
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Upload Section */}
        {!scormFile && (
          <div className="mb-8">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="single">Single Upload</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single">
                <UploadSection onFileUpload={handleFileUpload} />
              </TabsContent>
              
              <TabsContent value="bulk">
                <BulkScormUploader 
                  onComplete={(jobIds) => {
                    toast.success(`Successfully processed ${jobIds.length} SCORM package(s)`);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Validation Status */}
        {isValidating && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Validating and repairing SCORM package...
            </AlertDescription>
          </Alert>
        )}

        {/* Repair Results */}
        {repairResult && (repairResult.issues.length > 0 || repairResult.warnings.length > 0) && (
          <Alert variant={repairResult.issues.length > 0 ? "destructive" : "default"} className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {repairResult.fixes.length > 0 && (
                <div className="mb-2">
                  <strong>Fixes Applied:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {repairResult.fixes.map((fix, idx) => (
                      <li key={idx} className="text-sm">{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
              {repairResult.warnings.length > 0 && (
                <div className="mb-2">
                  <strong>Warnings:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {repairResult.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {repairResult.issues.length > 0 && (
                <div>
                  <strong>Issues:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {repairResult.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Status */}
        {jobId && (
          <div className="mb-6">
            <ProcessingStatus jobId={jobId} />
          </div>
        )}

        {/* Processing Tabs */}
        {scormFile && (
          <div className="space-y-6">
            {/* File Info Card */}
            <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{scormFile.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(scormFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setScormFile(null)}
                >
                  Upload Different File
                </Button>
              </div>
            </Card>

            {/* Main Processing Tabs */}
            <Tabs defaultValue="player" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-card/50">
                <TabsTrigger value="player" className="gap-2">
                  <Play className="w-4 h-4" />
                  Player
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-2">
                  <Video className="w-4 h-4" />
                  Videos
                </TabsTrigger>
                <TabsTrigger value="transcripts" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Transcripts
                </TabsTrigger>
                <TabsTrigger value="assessments" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="export" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </TabsTrigger>
              </TabsList>

              <TabsContent value="player" className="space-y-4">
                <RobustScormPlayer 
                  file={scormFile}
                  onDataCapture={(data) => console.log('SCORM Data:', data)}
                />
              </TabsContent>

              <TabsContent value="videos" className="space-y-4">
                <VideoExtractor file={scormFile} />
              </TabsContent>

              <TabsContent value="transcripts" className="space-y-4">
                <TranscriptGenerator 
                  file={scormFile} 
                  transcript={transcript}
                  onTranscriptChange={setTranscript}
                />
              </TabsContent>

              <TabsContent value="assessments" className="space-y-4">
                <AssessmentExtractor 
                  file={scormFile}
                  transcript={transcript}
                />
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <ExportOptions file={scormFile} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
