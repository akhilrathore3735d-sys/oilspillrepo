import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Home, Terminal, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled application error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage access errors
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "An unexpected application error occurred.";
      const isNetworkIssue =
        errorMsg.toLowerCase().includes("network") ||
        errorMsg.toLowerCase().includes("fetch") ||
        errorMsg.toLowerCase().includes("websocket") ||
        errorMsg.toLowerCase().includes("abort") ||
        errorMsg.toLowerCase().includes("connection");

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-[#060e1c] text-slate-100">
          <div className="max-w-xl w-full rounded-2xl border border-rose-900/60 bg-[#0a1628]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            {/* Header Badge */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-800/80 bg-rose-950/60 text-rose-400 shadow-inner">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 border border-rose-800/60">
                  {isNetworkIssue ? "Connection Notice" : "System Handled Exception"}
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  {this.props.fallbackTitle || (isNetworkIssue ? "Service Interruption Handled" : "Interface Rendering Interrupted")}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              {this.props.fallbackMessage ||
                (isNetworkIssue
                  ? "A transient network disconnect, backend pipeline reset, or WebSocket interruption occurred. The user interface has caught the event gracefully without crashing."
                  : "An unhandled interface error was captured by the platform guard. You can reset the active view or reload the workbench safely.")}
            </p>

            {/* Error Message Box */}
            <div className="mt-4 rounded-lg border border-[#1b3457] bg-[#050b14] p-3 text-xs font-mono text-cyan-300 break-all">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Error Diagnostic:</span>
              {errorMsg}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                id="error-boundary-retry-btn"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-cyan-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>

              <button
                id="error-boundary-reload-btn"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 rounded-lg border border-[#1b3457] bg-[#0c1a2f] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-[#12243f] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                <span>Reload Platform</span>
              </button>

              <button
                id="error-boundary-clear-btn"
                onClick={this.handleClearCacheAndReload}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Clear Cache & Reset</span>
              </button>
            </div>

            {/* Collapsible Technical Details */}
            {this.state.errorInfo && (
              <div className="mt-6 pt-4 border-t border-[#132742]">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>{this.state.showDetails ? "Hide Stack Trace" : "Show Technical Stack Trace"}</span>
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/70 p-3 text-[10px] font-mono text-slate-400 border border-slate-800 whitespace-pre-wrap leading-normal">
                    {this.state.error?.stack || "No call stack available."}
                    {"\n\nComponent Stack:"}
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
