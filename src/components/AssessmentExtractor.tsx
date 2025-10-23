import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle, Wand2, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { analyzeScormPackage } from "@/utils/scormAnalyzer";

interface AssessmentExtractorProps {
  file: File;
  transcript?: string;
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  questions: number;
}

export const AssessmentExtractor = ({ file, transcript }: AssessmentExtractorProps) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFromTranscript, setGeneratingFromTranscript] = useState(false);

  useEffect(() => {
    const extractAssessments = async () => {
      try {
        // Use the enhanced analyzer
        const analysis = await analyzeScormPackage(file);
        
        const foundAssessments: Assessment[] = analysis.assessments.map((assessment, idx) => ({
          id: `assessment-${idx}`,
          title: assessment.file,
          type: assessment.type.toUpperCase(),
          questions: assessment.questionCount
        }));
        
        if (foundAssessments.length === 0) {
          toast.info("No assessments detected in SCORM package");
        } else {
          toast.success(`Found ${foundAssessments.length} assessment(s)`);
        }
        
        setAssessments(foundAssessments);
        
        setLoading(false);
      } catch (error) {
        console.error("Error extracting assessments:", error);
        toast.error("Failed to extract assessments");
        setLoading(false);
      }
    };

    extractAssessments();
  }, [file]);

  const generateFromTranscript = async () => {
    if (!transcript || transcript.length < 100) {
      toast.error("Please generate a transcript first");
      return;
    }

    setGeneratingFromTranscript(true);
    toast.info("Analyzing transcript to extract assessment questions...");

    try {
      // Parse transcript for question patterns
      const lines = transcript.split('\n');
      const detectedQuestions: Assessment[] = [];
      let currentSection = "Transcript Assessment";
      let questionCount = 0;

      for (const line of lines) {
        // Detect section headers
        if (line.startsWith('===') || line.startsWith('##')) {
          const match = line.match(/[=#]+\s*(.+?)\s*[=#]*/);
          if (match) currentSection = match[1].trim();
          continue;
        }

        // Detect question patterns
        const isQuestion = /(\?|quiz|test|question|assessment|\d+\.|^Q\d+|^[A-D][\)\.])/.test(line) && 
                          line.length > 20 && 
                          line.length < 500;
        
        if (isQuestion) {
          questionCount++;
        }
      }

      if (questionCount > 0) {
        detectedQuestions.push({
          id: 'transcript-assessment',
          title: 'Transcript Generated Assessment',
          type: 'Transcript Analysis',
          questions: questionCount
        });

        setAssessments(prev => [...prev, ...detectedQuestions]);
        toast.success(`Found ${questionCount} potential question(s) in transcript`);
      } else {
        toast.info("No clear assessment patterns found in transcript");
      }

      setGeneratingFromTranscript(false);
    } catch (error) {
      console.error("Error generating from transcript:", error);
      toast.error("Failed to analyze transcript");
      setGeneratingFromTranscript(false);
    }
  };

  const exportAssessment = (assessment: Assessment) => {
    const data = {
      ...assessment,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessment.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${assessment.title}`);
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Extracting assessments...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transcript && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">Generate assessments from transcript</p>
              <p className="text-xs text-muted-foreground mt-1">
                Analyze the generated transcript to extract potential assessment questions
              </p>
            </div>
            <Button
              onClick={generateFromTranscript}
              disabled={generatingFromTranscript}
              variant="outline"
              className="gap-2"
            >
              {generatingFromTranscript ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate from Transcript
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {assessments.map((assessment) => (
        <Card key={assessment.id} className="p-6 hover:shadow-lg hover:shadow-primary/20 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              
              <div className="space-y-2">
                <div>
                  <h3 className="font-semibold text-lg">{assessment.title}</h3>
                  <p className="text-sm text-muted-foreground">ID: {assessment.id}</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary">
                    {assessment.type}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="w-4 h-4" />
                    {assessment.questions} questions
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => exportAssessment(assessment)}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </Card>
      ))}

      {assessments.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No assessments found in this SCORM package</p>
        </Card>
      )}
    </div>
  );
};
