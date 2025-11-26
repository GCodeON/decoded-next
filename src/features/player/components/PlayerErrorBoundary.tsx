'use client';
import React from 'react';

type State = { hasError: boolean };

type Props = {
  children: React.ReactNode;
  onRetry?: () => void;
};

export default class PlayerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Log to console — could be sent to external monitoring
    console.error('Player crashed:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-black text-white p-4 flex items-center justify-between">
          <div>
            <strong>Player error</strong>
            <div className="text-sm text-gray-300">The Spotify player encountered an error.</div>
          </div>
          <div>
            <button
              onClick={this.reset}
              className="bg-white text-black px-3 py-1 rounded"
            >
              Reload Player
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}
