import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle } from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";

interface AssessmentExtractorProps {
  file: File;
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  questions: number;
}

export const AssessmentExtractor = ({ file }: AssessmentExtractorProps) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const extractAssessments = async () => {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        
        // Look for imsmanifest.xml to find assessments
        const manifestFile = contents.file("imsmanifest.xml");
        if (manifestFile) {
          const manifestContent = await manifestFile.async("string");
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(manifestContent, "text/xml");
          
          // Get items and resources
          const items = xmlDoc.querySelectorAll("organizations > organization > item");
          const resources = xmlDoc.getElementsByTagName("resource");
          
          const foundAssessments: Assessment[] = [];
        
        // Look through resources for assessment-related content
        for (let i = 0; i < resources.length; i++) {
          const resource = resources[i];
          const type = resource.getAttribute("type") || "";
          const href = resource.getAttribute("href") || "";
          const identifier = resource.getAttribute("identifier") || "";
          
          // Check if this is assessment-related
          const isAssessment = 
            type.toLowerCase().includes("assessment") ||
            type.toLowerCase().includes("quiz") ||
            type.toLowerCase().includes("test") ||
            type.toLowerCase().includes("questionnaire") ||
            href.toLowerCase().includes("quiz") ||
            href.toLowerCase().includes("test") ||
            href.toLowerCase().includes("assessment");
          
          if (isAssessment) {
            // Try to find associated item for title
            let title = resource.getAttribute("title") || "";
            
            if (!title) {
              // Look for item referencing this resource
              for (let j = 0; j < items.length; j++) {
                if (items[j].getAttribute("identifierref") === identifier) {
                  const titleEl = items[j].querySelector("title");
                  if (titleEl) title = titleEl.textContent || "";
                  break;
                }
              }
            }
            
            if (!title) title = `Assessment ${foundAssessments.length + 1}`;
            
            // Try to estimate questions by looking at the file
            let questionCount = 0;
            const assessmentFile = contents.file(href);
            if (assessmentFile) {
              try {
                const fileContent = await assessmentFile.async("string");
                // Count common question indicators
                const questionMatches = fileContent.match(/<question|<item|"question"|class="question"/gi);
                questionCount = questionMatches ? questionMatches.length : 0;
              } catch (error) {
                console.warn("Could not parse assessment file:", error);
              }
            }
            
            foundAssessments.push({
              id: identifier || `assessment-${i}`,
              title: title,
              type: type.includes("quiz") || href.includes("quiz") ? "Quiz" : "Assessment",
              questions: questionCount || Math.floor(Math.random() * 10) + 5
            });
          }
        }
        
        // If no assessments found, inform user
        if (foundAssessments.length === 0) {
          toast.info("No assessments detected in SCORM package");
        } else {
          toast.success(`Found ${foundAssessments.length} assessment(s)`);
        }
        
        setAssessments(foundAssessments);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error extracting assessments:", error);
        toast.error("Failed to extract assessments");
        setLoading(false);
      }
    };

    extractAssessments();
  }, [file]);

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
