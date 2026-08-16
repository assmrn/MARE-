import { useEffect, useState } from "react";
import { formatClock } from "@/lib/utils";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end leading-none">
      <span className="mono text-xs font-semibold tabular-nums text-foreground">{formatClock(now)}</span>
      <span className="text-[10px] text-muted-foreground">UTC{now.getTimezoneOffset() > 0 ? "-" : "+"}
        {String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, "0")}
      </span>
    </div>
  );
}
