import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONVERSAS_URL =
  import.meta.env.VITE_CONVERSAS_URL ||
  "https://chat.techfala.com.br/";

export function ConversasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const reloadIframe = () => {
    setIsLoading(true);
    iframeRef.current?.contentWindow?.location.reload();
  };

  return (
    <div
      ref={containerRef}
      className="relative -mx-4 -mb-6 md:-mx-0 bg-background"
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/95 shadow-sm"
          onClick={reloadIframe}
          title="Recarregar conversas"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/95 shadow-sm"
          onClick={() => window.open(CONVERSAS_URL, "_blank", "noopener,noreferrer")}
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/95 shadow-sm"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div
          className="absolute inset-0 z-[5] flex items-center justify-center rounded-lg bg-background/90"
          style={{ height: isFullscreen ? "100vh" : "calc(100vh - 9.5rem)" }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando conversas...
          </div>
        </div>
      ) : null}

      <iframe
        ref={iframeRef}
        src={CONVERSAS_URL}
        title="Conversas"
        className="w-full border-0 rounded-lg bg-background"
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 9.5rem)" }}
        allow="microphone; camera; clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
