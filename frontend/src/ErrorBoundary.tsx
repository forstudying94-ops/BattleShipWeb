import { Component, ReactNode } from "react";
import { Card, Notice } from "./components/ui";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <Card className="message-card">
            <Notice>{this.state.error.message || "Something went wrong"}</Notice>
            <button onClick={() => window.location.reload()}>Reload</button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
