import { useState } from "react";
import { Upload, Video, FileText, MessageSquare, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadSection } from "@/components/UploadSection";
import { VideoExtractor } from "@/components/VideoExtractor";
import { TranscriptGenerator } from "@/components/TranscriptGenerator";
import { AssessmentExtractor } from "@/components/AssessmentExtractor";
import { ScormPlayer } from "@/components/ScormPlayer";
import { ExportOptions } from "@/components/ExportOptions";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [scormFile, setScormFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setScormFile(file);
    
    // Create processing job in database
    const { data, error } = await supabase
      .from('scorm_jobs')
      .insert({
        filename: file.name,
        status: 'processing',
        metadata: { size: file.size, type: file.type }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create processing job');
    } else if (data) {
      setJobId(data.id);
      toast.success('Processing job created!');
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Upload Section */}
        {!scormFile && (
          <div className="mb-8">
            <UploadSection onFileUpload={handleFileUpload} />
          </div>
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
                <ScormPlayer file={scormFile} />
              </TabsContent>

              <TabsContent value="videos" className="space-y-4">
                <VideoExtractor file={scormFile} />
              </TabsContent>

              <TabsContent value="transcripts" className="space-y-4">
                <TranscriptGenerator file={scormFile} />
              </TabsContent>

              <TabsContent value="assessments" className="space-y-4">
                <AssessmentExtractor file={scormFile} />
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
