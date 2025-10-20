import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Video, Image, Code, Music, AlertCircle, CheckCircle } from "lucide-react";
import type { ScormAnalysis } from "@/utils/scormAnalyzer";

interface ScormAnalysisReportProps {
  analysis: ScormAnalysis;
}

export const ScormAnalysisReport = ({ analysis }: ScormAnalysisReportProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          SCORM Package Analysis Report
        </h3>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Format</p>
            <p className="font-semibold">{analysis.format}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Version</p>
            <p className="font-semibold">{analysis.version}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Structure Items</p>
            <p className="font-semibold">{analysis.structure.length}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Resources</p>
            <p className="font-semibold">{analysis.resources.length}</p>
          </div>
        </div>

        {/* Course Info */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Course Information</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Title:</span>{" "}
              <span className="font-medium">{analysis.title}</span>
            </div>
            {analysis.metadata.description && (
              <div>
                <span className="text-muted-foreground">Description:</span>{" "}
                <span>{analysis.metadata.description}</span>
              </div>
            )}
            {analysis.metadata.duration && (
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                <span>{analysis.metadata.duration}</span>
              </div>
            )}
            {analysis.metadata.keywords?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-muted-foreground">Keywords:</span>
                {analysis.metadata.keywords.map((keyword: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Files */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Content Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">HTML Files</p>
                <p className="font-semibold">{analysis.contentFiles.html.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Video className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Videos</p>
                <p className="font-semibold">{analysis.contentFiles.videos.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Music className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Audio</p>
                <p className="font-semibold">{analysis.contentFiles.audio.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Image className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="font-semibold">{analysis.contentFiles.images.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Code className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">JavaScript</p>
                <p className="font-semibold">{analysis.contentFiles.javascript.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Code className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xs text-muted-foreground">CSS</p>
                <p className="font-semibold">{analysis.contentFiles.css.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessments */}
        {analysis.assessments.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Detected Assessments</h4>
            <div className="space-y-2">
              {analysis.assessments.map((assessment: any, idx: number) => (
                <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{assessment.file}</span>
                    <Badge>{assessment.questionCount} questions</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Structure */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="structure">
            <AccordionTrigger>Course Structure (Detailed)</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {analysis.structure.map((item: any, idx: number) => (
                  <StructureItem key={idx} item={item} level={0} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="resources">
            <AccordionTrigger>Resources ({analysis.resources.length})</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.resources.map((resource: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                    <div className="font-medium">{resource.identifier}</div>
                    <div className="text-xs text-muted-foreground">
                      Type: {resource.type} | Entry: {resource.href}
                    </div>
                    {resource.files && resource.files.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {resource.files.length} file(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {analysis.contentFiles.videos.length > 0 && (
            <AccordionItem value="videos">
              <AccordionTrigger>Video Files ({analysis.contentFiles.videos.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.videos.map((video: string, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded text-sm font-mono">
                      {video}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.html.length > 0 && (
            <AccordionItem value="html">
              <AccordionTrigger>HTML Files ({analysis.contentFiles.html.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.html.map((html: string, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded text-sm font-mono">
                      {html}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </Card>
    </div>
  );
};

const StructureItem = ({ item, level }: { item: any; level: number }) => {
  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="space-y-1">
      <div className="p-2 bg-muted/50 rounded-lg text-sm">
        <div className="font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground">
          ID: {item.identifier}
          {item.identifierref && ` | Ref: ${item.identifierref}`}
        </div>
      </div>
      {item.children?.map((child: any, idx: number) => (
        <StructureItem key={idx} item={child} level={level + 1} />
      ))}
    </div>
  );
};
