// SENTINEL X - AI Trend Scanner
// Upload chart images for AI-powered trade analysis

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Upload, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Image as ImageIcon,
  X,
  Sparkles,
  Target,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AnalysisResult {
  analysis: string;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  timestamp: string;
}

export const AITrendScanner = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [marketContext, setMarketContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast.error("Please upload a chart image first");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-trend", {
        body: {
          imageBase64: selectedImage,
          marketContext: marketContext || undefined
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast.success(`Analysis complete: ${data.direction} signal detected`);

    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getDirectionIcon = () => {
    if (!result) return null;
    switch (result.direction) {
      case "BUY": return <TrendingUp className="w-6 h-6" />;
      case "SELL": return <TrendingDown className="w-6 h-6" />;
      default: return <Minus className="w-6 h-6" />;
    }
  };

  const getDirectionColor = () => {
    if (!result) return "";
    switch (result.direction) {
      case "BUY": return "text-success bg-success/20 border-success/50";
      case "SELL": return "text-destructive bg-destructive/20 border-destructive/50";
      default: return "text-muted-foreground bg-muted/20 border-muted/50";
    }
  };

  return (
    <Card className="p-6 border border-border/50 gradient-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">AI Trend Scanner</h3>
          <p className="text-xs text-muted-foreground">Upload chart for instant analysis</p>
        </div>
        <Badge variant="outline" className="ml-auto gap-1">
          <Sparkles className="w-3 h-3" />
          Powered by AI
        </Badge>
      </div>

      {/* Upload Area */}
      <div 
        className={`relative border-2 border-dashed rounded-lg p-6 mb-4 transition-colors ${
          selectedImage 
            ? "border-primary/50 bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {selectedImage ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full bg-destructive/90 hover:bg-destructive"
              onClick={clearImage}
            >
              <X className="w-3 h-3 text-destructive-foreground" />
            </Button>
            <img 
              src={selectedImage} 
              alt="Chart to analyze" 
              className="w-full max-h-64 object-contain rounded-lg"
            />
          </div>
        ) : (
          <div 
            className="flex flex-col items-center gap-3 cursor-pointer py-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-4 rounded-full bg-muted/50">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop chart image here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Select Image
            </Button>
          </div>
        )}
      </div>

      {/* Context Input */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1 block">
          Market Context (optional)
        </label>
        <Textarea
          placeholder="e.g., EUR/USD 5m chart, London session, looking for reversal..."
          value={marketContext}
          onChange={(e) => setMarketContext(e.target.value)}
          className="resize-none h-16 text-sm"
        />
      </div>

      {/* Analyze Button */}
      <Button 
        className="w-full gap-2 mb-4" 
        onClick={handleAnalyze}
        disabled={!selectedImage || isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing Chart...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Analyze Trend
          </>
        )}
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {/* Direction Badge */}
          <div className={`p-4 rounded-lg border ${getDirectionColor()}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getDirectionIcon()}
                <div>
                  <p className="font-bold text-lg">{result.direction}</p>
                  <p className="text-xs opacity-80">Recommended Action</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-bold">{result.confidence}%</p>
                <p className="text-xs opacity-80">Confidence</p>
              </div>
            </div>
          </div>

          {/* Analysis Content */}
          <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-sm">Detailed Analysis</h4>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground">
              <ReactMarkdown>{result.analysis}</ReactMarkdown>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(result.timestamp).toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              AI Analysis
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
