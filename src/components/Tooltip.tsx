import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Info, HelpCircle } from "lucide-react";

interface TooltipProps {
  children?: ReactNode;
  content?: string | ReactNode;
  text?: string | ReactNode;
  title?: string;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: "sm" | "md" | "lg";
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  text,
  title = "Analytical Estimate",
  className = "",
  position = "top",
  size = "md",
}) => {
  const resolvedContent =
    text ||
    content ||
    "Analytical Estimate based on SAR features (radar backscatter damping and pixel morphology) rather than an absolute environmental measurement.";
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const sizeClasses = {
    sm: "w-56 text-[11px]",
    md: "w-72 text-xs",
    lg: "w-80 text-xs",
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {/* Trigger */}
      {children ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          className="inline-flex items-center text-slate-400 hover:text-cyan-300 focus:outline-none transition-colors"
          aria-label={typeof content === "string" ? content : "Analytical Estimate clarification"}
        >
          {children}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          className="inline-flex items-center justify-center text-slate-400 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none transition-colors p-0.5 rounded-full hover:bg-slate-800/60"
          aria-label="Analytical Estimate clarification"
        >
          <HelpCircle className="h-3.5 w-3.5 text-cyan-400/80 hover:text-cyan-300" />
        </button>
      )}

      {/* Popover Bubble */}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 ${positionClasses[position]} ${sizeClasses[size]} rounded-xl border border-cyan-700/60 bg-[#081528]/95 p-3 text-slate-200 shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95 pointer-events-auto`}
        >
          <div className="flex items-center gap-1.5 pb-1 border-b border-cyan-900/60 mb-1.5">
            <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {title}
            </span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-300">
            {resolvedContent}
          </div>
          <div className="mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>SAR Feature Extraction</span>
            <span className="text-cyan-400">Non-In-Situ</span>
          </div>
        </div>
      )}
    </div>
  );
};
