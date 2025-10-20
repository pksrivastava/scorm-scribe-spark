import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProcessingStatusProps {
  jobId: string | null;
}

export const ProcessingStatus = ({ jobId }: ProcessingStatusProps) => {
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = async () => {
      const { data } = await supabase
        .from('scorm_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (data) {
        setJob(data);
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (!job) return null;

  const progress = job.status === 'completed' ? 100 : 
                  job.status === 'processing' ? 50 : 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Processing Status</span>
          {job.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{job.video_count || 0}</div>
            <div className="text-muted-foreground">Videos</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{job.transcript_count || 0}</div>
            <div className="text-muted-foreground">Transcripts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{job.assessment_count || 0}</div>
            <div className="text-muted-foreground">Assessments</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
