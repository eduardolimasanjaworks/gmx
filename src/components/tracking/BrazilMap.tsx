import { useState, useRef, useEffect } from "react";

interface Coordinate {
  lat: number;
  lng: number;
}

interface MapProps {
  vehicles: Array<{
    id: string;
    position: Coordinate;
    status: string;
    label: string;
  }>;
  onVehicleClick?: (id: string) => void;
  selectedVehicleId?: string;
}

export function BrazilMap({ vehicles, onVehicleClick, selectedVehicleId }: MapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert lat/lng to SVG coordinates (Brazil bounds)
  const latLngToXY = (lat: number, lng: number) => {
    // Brazil approximate bounds: lat -33 to 5, lng -74 to -34
    const x = ((lng + 74) / 40) * 100;
    const y = ((5 - lat) / 38) * 100;
    return { x, y };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "em_transito": return "hsl(var(--warning))";
      case "aguardando_motorista": return "hsl(var(--muted-foreground))";
      case "chegou_destino": return "hsl(var(--success))";
      case "atrasado": return "hsl(var(--destructive))";
      default: return "hsl(var(--primary))";
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-muted/20 overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-background border border-border p-2 rounded-md shadow-lg hover:bg-accent"
          title={isFullscreen ? "Sair fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? "🗗" : "⛶"}
        </button>
        <button
          onClick={() => setZoom(prev => Math.min(5, prev * 1.2))}
          className="bg-background border border-border px-3 py-1 rounded-md shadow-lg hover:bg-accent"
        >
          +
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          className="bg-background border border-border px-3 py-1 rounded-md shadow-lg hover:bg-accent"
        >
          −
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="bg-background border border-border px-2 py-1 rounded-md shadow-lg hover:bg-accent text-xs"
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur border border-border p-3 rounded-lg shadow-lg">
        <div className="text-sm font-medium mb-2">Status</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor("em_transito") }} />
            <span>Em Trânsito</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor("chegou_destino") }} />
            <span>No Destino</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor("atrasado") }} />
            <span>Atrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor("aguardando_motorista") }} />
            <span>Aguardando</span>
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'transform 0.1s'
        }}
      >
        {/* Simplified Brazil outline */}
        <path
          d="M 60,10 L 70,15 L 75,20 L 80,30 L 82,40 L 80,50 L 75,60 L 70,70 L 65,75 L 55,78 L 45,78 L 35,75 L 25,70 L 20,60 L 18,50 L 15,40 L 15,30 L 20,20 L 30,15 L 40,12 L 50,10 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />
        
        {/* State borders (simplified) */}
        <g stroke="hsl(var(--border))" strokeWidth="0.2" fill="none" opacity="0.5">
          <line x1="30" y1="20" x2="70" y2="20" />
          <line x1="25" y1="40" x2="80" y2="40" />
          <line x1="20" y1="60" x2="75" y2="60" />
          <line x1="40" y1="15" x2="40" y2="75" />
          <line x1="60" y1="15" x2="60" y2="75" />
        </g>

        {/* Vehicle markers */}
        {vehicles.map((vehicle) => {
          const pos = latLngToXY(vehicle.position.lat, vehicle.position.lng);
          const isSelected = selectedVehicleId === vehicle.id;
          
          return (
            <g
              key={vehicle.id}
              onClick={() => onVehicleClick?.(vehicle.id)}
              style={{ cursor: 'pointer' }}
              className="transition-transform hover:scale-110"
            >
              {/* Pulse animation for selected */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="2"
                  fill={getStatusColor(vehicle.status)}
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    from="2"
                    to="4"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.3"
                    to="0"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              
              {/* Main marker */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? "1.5" : "1"}
                fill={getStatusColor(vehicle.status)}
                stroke="hsl(var(--background))"
                strokeWidth="0.2"
              />
              
              {/* Label */}
              <text
                x={pos.x}
                y={pos.y - 2}
                fontSize="2"
                fill="hsl(var(--foreground))"
                textAnchor="middle"
                className="pointer-events-none"
                style={{ textShadow: '0 0 2px hsl(var(--background))' }}
              >
                {vehicle.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
