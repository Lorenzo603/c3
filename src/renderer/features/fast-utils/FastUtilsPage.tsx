import { useState, useCallback } from 'react';

interface UtilsTool {
  id: 'base64-encode' | 'base64-decode';
  label: string;
  description: string;
}

const TOOLS: UtilsTool[] = [
  {
    id: 'base64-encode',
    label: 'Base64 Encode',
    description: 'Encode plain text to Base64'
  },
  {
    id: 'base64-decode',
    label: 'Base64 Decode',
    description: 'Decode Base64 to plain text'
  }
];

export function FastUtilsPage() {
  const [activeToolId, setActiveToolId] = useState<UtilsTool['id']>('base64-encode');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const activeTool = TOOLS.find((t) => t.id === activeToolId)!;

  const handleTransform = useCallback(() => {
    setError('');
    setResult('');
    setCopied(false);

    if (!input.trim()) {
      return;
    }

    try {
      if (activeToolId === 'base64-encode') {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setResult(encoded);
      } else {
        const decoded = decodeURIComponent(escape(atob(input.trim())));
        setResult(decoded);
      }
    } catch {
      setError('Invalid input for the selected operation.');
    }
  }, [input, activeToolId]);

  const handleCopy = useCallback(async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  }, [result]);

  const handleClear = useCallback(() => {
    setInput('');
    setResult('');
    setError('');
    setCopied(false);
  }, []);

  return (
    <section className="fast-utils-page" aria-label="Fast Utils">
      <div className="fast-utils-tools">
        <h2>Available Tools</h2>
        <p className="fast-utils-subtitle">
          Quick utilities for common transformations.
        </p>

        <div className="fast-utils-tool-tabs">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`fast-utils-tool-tab${tool.id === activeToolId ? ' is-active' : ''}`}
              onClick={() => {
                setActiveToolId(tool.id);
                handleClear();
              }}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fast-utils-surface">
        <div className="fast-utils-input-area">
          <label htmlFor="fast-utils-input" className="fast-utils-label">
            {activeTool.description}
          </label>
          <textarea
            id="fast-utils-input"
            className="fast-utils-textarea"
            placeholder={`Enter text to ${activeToolId === 'base64-encode' ? 'encode' : 'decode'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
          />
          <div className="fast-utils-actions">
            <button
              type="button"
              className="fast-utils-btn fast-utils-btn-primary"
              onClick={handleTransform}
              disabled={!input.trim()}
            >
              {activeTool.label}
            </button>
            <button
              type="button"
              className="fast-utils-btn fast-utils-btn-secondary"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="fast-utils-output-area">
          <label className="fast-utils-label">Result</label>
          <div className="fast-utils-output">
            {error ? (
              <span className="fast-utils-error">{error}</span>
            ) : result ? (
              <>
                <code className="fast-utils-result">{result}</code>
                <button
                  type="button"
                  className="fast-utils-copy-btn"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : (
              <span className="fast-utils-placeholder">Result will appear here</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
