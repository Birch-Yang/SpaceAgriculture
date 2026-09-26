"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; onFallback: () => void };
type State = { failed: boolean };

export class MinigameBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  render() {
    if (this.state.failed) return <div role="alert">
      <p>The minigame could not load. Continue the action with a neutral modifier.</p>
      <button onClick={this.props.onFallback}>Continue action</button>
    </div>;
    return this.props.children;
  }
}
