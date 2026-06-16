import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHAT_URL = "https://chat.sanjaworks.com";

export function ConversasPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div
      ref={containerRef}
      className="relative -mx-4 -mb-6 md:-mx-0 bg-background"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-3 right-3 z-10 h-8 w-8 bg-background/95 shadow-sm"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>

      <iframe
        src={CHAT_URL}
        title="Conversas"
        className="w-full border-0 rounded-lg bg-background"
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 9.5rem)" }}
        allow="microphone; camera; clipboard-read; clipboard-write"
      />
    </div>
  );
}
