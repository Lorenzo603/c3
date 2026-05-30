import { useMemo, useState, type FormEvent } from 'react';
import type {
  FindProcessByPortResponse,
  KillProcessResponse
} from '../../../shared/process';
import {
  createProcessKillGateway,
  type ProcessKillGateway
} from './services/processKillGateway';

export interface ProcessKillPageProps {
  gateway?: ProcessKillGateway;
}

function parsePort(input: string): number | undefined {
  if (!/^\d+$/.test(input.trim())) {
    return undefined;
  }

  const port = Number.parseInt(input, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return undefined;
  }

  return port;
}

export function ProcessKillPage({ gateway }: ProcessKillPageProps) {
  const [portInput, setPortInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isKilling, setIsKilling] = useState(false);
  const [formMessage, setFormMessage] = useState<string>('');
  const [searchResult, setSearchResult] = useState<FindProcessByPortResponse | undefined>();
  const [killResult, setKillResult] = useState<KillProcessResponse | undefined>();

  const effectiveGateway = useMemo(
    () => gateway ?? createProcessKillGateway(window.c3Desktop),
    [gateway]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const port = parsePort(portInput);
    if (!port) {
      setFormMessage('Enter a valid port between 1 and 65535.');
      setSearchResult(undefined);
      setKillResult(undefined);
      return;
    }

    setIsSearching(true);
    setFormMessage('');
    setKillResult(undefined);

    try {
      const result = await effectiveGateway.findProcessByPort({ port });
      setSearchResult(result);
      setFormMessage(result.message);
    } catch (error) {
      setSearchResult(undefined);
      setFormMessage(error instanceof Error ? error.message : 'Unable to search for process by port.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleKill() {
    const processDetails = searchResult?.process;
    if (!processDetails) {
      return;
    }

    setIsKilling(true);
    setKillResult(undefined);

    try {
      const result = await effectiveGateway.killProcess({ pid: processDetails.pid });
      setKillResult(result);
    } catch (error) {
      setKillResult({
        pid: processDetails.pid,
        accepted: false,
        message: error instanceof Error ? error.message : 'Unable to terminate process.'
      });
    } finally {
      setIsKilling(false);
    }
  }

  const processDetails = searchResult?.found ? searchResult.process : undefined;

  return (
    <section className="process-kill-page" aria-label="Process kill page">
      <section className="process-kill-surface" aria-label="Find process by port">
        <h2>Find Process by Port</h2>
        <p className="process-kill-subtitle">
          Enter a listening port to inspect the bound process and optionally terminate it.
        </p>

        <form className="process-kill-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="process-kill-port">Port Number</label>
          <div className="process-kill-row">
            <input
              id="process-kill-port"
              name="port"
              type="number"
              min={1}
              max={65535}
              value={portInput}
              onChange={(event) => {
                setPortInput(event.target.value);
              }}
              placeholder="e.g. 5432"
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {formMessage ? <p className="process-kill-message">{formMessage}</p> : null}
      </section>

      {processDetails ? (
        <section className="process-kill-surface" aria-label="Process details">
          <div className="process-kill-details-header">
            <h3>Process Details</h3>
            <button type="button" disabled={isKilling} onClick={() => void handleKill()}>
              {isKilling ? 'Killing...' : `Kill PID ${processDetails.pid}`}
            </button>
          </div>

          <dl className="process-kill-details">
            <dt>Name</dt>
            <dd>{processDetails.name}</dd>
            <dt>PID</dt>
            <dd>{processDetails.pid}</dd>
            <dt>User</dt>
            <dd>{processDetails.user ?? 'Unknown'}</dd>
            <dt>Address</dt>
            <dd>{processDetails.address ?? `Port ${searchResult?.port ?? ''}`}</dd>
            <dt>Command</dt>
            <dd className="process-kill-command">{processDetails.command}</dd>
          </dl>

          {killResult ? (
            <p className={`process-kill-action ${killResult.accepted ? 'accepted' : 'failed'}`}>
              {killResult.message}
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
