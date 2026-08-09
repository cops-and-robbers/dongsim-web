"use client";

import { Component, Suspense, type ReactNode } from "react";
import { ErrorBlock } from "./Parts";

// Relay 쿼리용 경계: Suspense(로딩) + ErrorBoundary(에러+재시도).
class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  reset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };
  render() {
    if (this.state.hasError) return <ErrorBlock onRetry={this.reset} />;
    return this.props.children;
  }
}

export default function QueryBoundary({
  children,
  pending,
  onRetry,
}: {
  children: ReactNode;
  pending: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <ErrorBoundary onReset={onRetry}>
      <Suspense fallback={pending}>{children}</Suspense>
    </ErrorBoundary>
  );
}
