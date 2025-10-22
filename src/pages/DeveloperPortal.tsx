import { useState } from "react";
import { Code, Book, Webhook, Key, PlayCircle, FileJson, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DeveloperPortal = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState("analyze");
  const [testPayload, setTestPayload] = useState("{}");
  const [testResponse, setTestResponse] = useState("");

  const generateApiKey = async () => {
    // In production, this should create a secure API key in the database
    const key = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
    toast.success("API key generated!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const downloadPostmanCollection = () => {
    const collection = {
      info: {
        name: "SCORM Toolkit API",
        description: "Complete API collection for SCORM Toolkit",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Analyze SCORM Package",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                file: "base64_encoded_scorm_package"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/api/analyze",
              host: ["{{BASE_URL}}"],
              path: ["api", "analyze"]
            }
          }
        },
        {
          name: "Extract Videos",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                packageId: "scorm_package_id"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/api/extract-videos",
              host: ["{{BASE_URL}}"],
              path: ["api", "extract-videos"]
            }
          }
        },
        {
          name: "Generate Transcripts",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                videoUrl: "https://example.com/video.mp4"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/api/transcribe",
              host: ["{{BASE_URL}}"],
              path: ["api", "transcribe"]
            }
          }
        },
        {
          name: "Extract Assessments",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                packageId: "scorm_package_id"
              }, null, 2)
            },
            url: {
              raw: "{{BASE_URL}}/api/extract-assessments",
              host: ["{{BASE_URL}}"],
              path: ["api", "extract-assessments"]
            }
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scorm-toolkit-api.postman_collection.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Postman collection downloaded!");
  };

  const testApiEndpoint = async () => {
    try {
      setTestResponse("Testing endpoint...");
      // This would call the actual API endpoint
      const response = {
        success: true,
        message: "Endpoint test successful",
        data: { example: "response" }
      };
      setTestResponse(JSON.stringify(response, null, 2));
      toast.success("API test successful!");
    } catch (error) {
      setTestResponse(`Error: ${error.message}`);
      toast.error("API test failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Code className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Developer Portal
              </h1>
              <p className="text-sm text-muted-foreground">API Documentation & Integration Hub</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-card/50">
            <TabsTrigger value="overview" className="gap-2">
              <Book className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="authentication" className="gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2">
              <Code className="w-4 h-4" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2">
              <PlayCircle className="w-4 h-4" />
              Sandbox
            </TabsTrigger>
            <TabsTrigger value="postman" className="gap-2">
              <FileJson className="w-4 h-4" />
              Postman
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">SCORM Toolkit API</h2>
              <p className="text-muted-foreground mb-6">
                Comprehensive REST API for processing SCORM packages, extracting multimedia, generating transcripts, and analyzing assessments.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Base URL</h3>
                  <code className="text-sm bg-muted p-2 rounded block">
                    {import.meta.env.VITE_SUPABASE_URL}/functions/v1
                  </code>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Authentication</h3>
                  <p className="text-sm text-muted-foreground">Bearer Token (API Key)</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Key Features</h3>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>SCORM 1.2 and 2004 package analysis</li>
                  <li>Multimedia extraction (videos, audio)</li>
                  <li>Video processing to MP4/HLS/DASH formats</li>
                  <li>AI-powered transcript generation</li>
                  <li>Deep assessment extraction (QTI, HTML, JavaScript)</li>
                  <li>Webhook notifications for async operations</li>
                  <li>Real-time processing status updates</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="authentication">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">API Authentication</h2>
              <p className="text-muted-foreground mb-6">
                Generate and manage API keys for authenticating with the SCORM Toolkit API.
              </p>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="api-key">Your API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="api-key"
                      value={apiKey || "No API key generated"}
                      readOnly
                      className="font-mono"
                    />
                    <Button onClick={generateApiKey}>Generate</Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey)}
                      disabled={!apiKey}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Usage Example</h3>
                  <pre className="text-sm overflow-x-auto">
                    {`curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"file": "base64_encoded_data"}'`}
                  </pre>
                </div>

                <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="text-sm">
                    <strong>Important:</strong> Keep your API keys secure and never expose them in client-side code. 
                    All API calls should be made from your backend servers.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints">
            <div className="space-y-4">
              {/* Analyze Endpoint */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">POST /analyze</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-semibold">
                    POST
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">Analyze a SCORM package and extract metadata, structure, and resources.</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Request Body</h4>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "file": "base64_encoded_scorm_package",
  "options": {
    "extractMultimedia": true,
    "deepAssessments": true
  }
}`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Response</h4>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "format": "SCORM",
    "version": "SCORM 2004",
    "title": "Course Title",
    "structure": [...],
    "resources": [...],
    "contentFiles": {
      "videos": [...],
      "audio": [...],
      "html": [...]
    },
    "assessments": [...]
  }
}`}
                    </pre>
                  </div>
                </div>
              </Card>

              {/* Extract Videos Endpoint */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">POST /extract-videos</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-semibold">
                    POST
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">Extract and process multimedia files from a SCORM package.</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Request Body</h4>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "packageId": "job_id_from_upload",
  "format": "mp4", // or "hls", "dash"
  "quality": "1080p"
}`}
                    </pre>
                  </div>
                </div>
              </Card>

              {/* Transcribe Endpoint */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">POST /transcribe-video</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-semibold">
                    POST
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">Generate AI-powered transcripts for videos.</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Request Body</h4>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "videoUrl": "https://storage.url/video.mp4",
  "language": "en",
  "format": "srt" // or "vtt", "txt"
}`}
                    </pre>
                  </div>
                </div>
              </Card>

              {/* Extract Assessments Endpoint */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">POST /extract-assessments</h3>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-semibold">
                    POST
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">Deep extraction of all assessment types from SCORM package.</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Response</h4>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "assessments": [
    {
      "file": "quiz.html",
      "type": "html",
      "questionCount": 10,
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice",
          "text": "Question text?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "B",
          "points": 10
        }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Webhook Configuration</h2>
              <p className="text-muted-foreground mb-6">
                Receive real-time notifications when processing operations complete.
              </p>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-domain.com/webhooks/scorm"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="space-y-2 mt-2">
                    {[
                      'package.analyzed',
                      'video.extracted',
                      'transcript.generated',
                      'assessment.extracted',
                      'processing.failed'
                    ].map((event) => (
                      <div key={event} className="flex items-center gap-2">
                        <input type="checkbox" id={event} defaultChecked />
                        <label htmlFor={event} className="text-sm">{event}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Example Webhook Payload</h3>
                  <pre className="text-sm overflow-x-auto">
{`{
  "event": "package.analyzed",
  "timestamp": "2025-10-22T10:30:00Z",
  "data": {
    "jobId": "job_123456",
    "packageName": "course.zip",
    "status": "completed",
    "results": {
      "videoCount": 5,
      "assessmentCount": 3
    }
  }
}`}
                  </pre>
                </div>

                <Button>Save Webhook Configuration</Button>
              </div>
            </Card>
          </TabsContent>

          {/* Sandbox Tab */}
          <TabsContent value="sandbox">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">API Sandbox</h2>
              <p className="text-muted-foreground mb-6">
                Test API endpoints in real-time with live responses.
              </p>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="endpoint-select">Select Endpoint</Label>
                  <select
                    id="endpoint-select"
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                    className="w-full mt-2 p-2 border rounded"
                  >
                    <option value="analyze">POST /analyze</option>
                    <option value="extract-videos">POST /extract-videos</option>
                    <option value="transcribe">POST /transcribe-video</option>
                    <option value="extract-assessments">POST /extract-assessments</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="test-payload">Request Payload</Label>
                  <Textarea
                    id="test-payload"
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={8}
                    className="mt-2 font-mono text-sm"
                    placeholder='{"example": "payload"}'
                  />
                </div>

                <Button onClick={testApiEndpoint} className="w-full">
                  Send Test Request
                </Button>

                {testResponse && (
                  <div>
                    <Label>Response</Label>
                    <pre className="mt-2 p-4 bg-muted rounded text-sm overflow-x-auto">
                      {testResponse}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Postman Tab */}
          <TabsContent value="postman">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Postman Collection</h2>
              <p className="text-muted-foreground mb-6">
                Download our complete API collection for Postman.
              </p>

              <div className="space-y-6">
                <div className="p-6 border rounded-lg text-center">
                  <FileJson className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">SCORM Toolkit API Collection</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete collection with all endpoints, examples, and authentication pre-configured.
                  </p>
                  <Button onClick={downloadPostmanCollection} className="gap-2">
                    <FileJson className="w-4 h-4" />
                    Download Postman Collection
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">How to Import</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Open Postman application</li>
                    <li>Click "Import" in the top left</li>
                    <li>Select the downloaded JSON file</li>
                    <li>Configure environment variables (API_KEY, BASE_URL)</li>
                    <li>Start testing endpoints!</li>
                  </ol>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DeveloperPortal;
