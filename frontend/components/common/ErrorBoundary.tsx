"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger border border-danger/20 mb-6 shadow-glow shadow-red-500/10">
            <AlertOctagon className="h-7 w-7 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold font-heading text-text-primary mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-text-muted max-w-md mb-6 leading-relaxed">
            ResolveIQ encountered a runtime error. This might be due to a network interruption or an unhandled UI exception.
          </p>
          {this.state.error && (
            <pre className="text-left bg-surface/80 border border-border p-4 rounded-lg text-xs font-mono text-danger max-w-lg overflow-auto mb-8 max-h-[160px] w-full">
              {this.state.error.toString()}
            </pre>
          )}
          <div className="flex space-x-4">
            <Button variant="primary" size="md" onClick={this.handleReset}>
              Reload Application
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => (window.location.href = "/")}
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
