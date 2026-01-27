import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ShipmentTimerProps {
  deadline?: string;
  className?: string;
  highlight?: boolean;
  realtime?: boolean;
}

export const ShipmentTimer = ({ deadline, className = "", highlight = false, realtime = false }: ShipmentTimerProps) => {
  const [timeElapsed, setTimeElapsed] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setTimeElapsed("");
      return;
    }

    const calculateTime = () => {
      const deadlineTime = parseDeadlineTime(deadline);
      if (!deadlineTime) {
        setTimeElapsed(deadline);
        return;
      }

      const now = new Date();
      const diff = now.getTime() - deadlineTime.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setSeconds(secs);

      if (days > 0) {
        setTimeElapsed(`Há ${days}d ${hours}h ${minutes}m ${realtime ? `${secs}s` : ''}`);
      } else if (hours > 0) {
        setTimeElapsed(`Há ${hours}h ${minutes}m ${realtime ? `${secs}s` : ''}`);
      } else if (minutes > 0) {
        setTimeElapsed(`Há ${minutes}m ${realtime ? `${secs}s` : ''}`);
      } else {
        setTimeElapsed(`Há ${secs}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, realtime ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [deadline, realtime]);

  if (!deadline || !timeElapsed) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 text-xs ${highlight ? 'animate-pulse' : ''} ${className}`}>
      <Clock className={`h-3 w-3 ${highlight ? 'text-warning' : ''}`} />
      <span className={`font-medium ${highlight ? 'text-warning font-bold' : ''}`}>
        {timeElapsed}
      </span>
    </div>
  );
};

function parseDeadlineTime(deadline: string): Date | null {
  if (!deadline || typeof deadline !== 'string') {
    return null;
  }

  const now = new Date();
  
  if (deadline.includes("min")) {
    const minutes = parseInt(deadline.match(/\d+/)?.[0] || "0");
    return new Date(now.getTime() - minutes * 60 * 1000);
  }
  
  if (deadline.includes("h") && !deadline.includes("Há")) {
    const hours = parseInt(deadline.match(/\d+/)?.[0] || "0");
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }

  if (deadline.includes("Há") && deadline.includes("h")) {
    const hours = parseInt(deadline.match(/\d+/)?.[0] || "0");
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
  
  return null;
}
