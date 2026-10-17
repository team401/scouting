import { env } from 'cloudflare:workers';
import { shouldRefreshTbaEvent } from '@/lib/scheduled-tba-refresh-policy';
import { syncTbaEvent } from '@/lib/tba-event-sync';

type CurrentEvent = {
  organizationId: string;
  eventKey: string;
  startDate: string | null;
  endDate: string | null;
  updatedAt: number;
};

function log(level: 'info' | 'error', message: string, details = {}) {
  const entry = JSON.stringify({
    level,
    source: 'scheduled-tba-refresh',
    message,
    ...details,
  });
  if (level === 'error') console.error(entry);
  else console.log(entry);
}

export async function runScheduledTbaRefresh(scheduledAt = Date.now()) {
  const events = await env.DB.prepare(
    `SELECT organization_id AS organizationId, tba_event_key AS eventKey,
       start_date AS startDate, end_date AS endDate, updated_at AS updatedAt
     FROM events
     WHERE is_current = 1 AND tba_event_key IS NOT NULL`,
  ).all<CurrentEvent>();
  const due = events.results.filter((event) =>
    shouldRefreshTbaEvent(event, scheduledAt),
  );
  if (!due.length) {
    log('info', 'No current events require a refresh', {
      currentEventCount: events.results.length,
    });
    return { attempted: 0, refreshed: 0 };
  }

  const results = await Promise.allSettled(
    due.map(async (event) => {
      const result = await syncTbaEvent(event.organizationId, event.eventKey);
      log('info', 'Current event refreshed', {
        organizationId: event.organizationId,
        eventKey: event.eventKey,
        matchCount: result.matchCount,
      });
      return result;
    }),
  );
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          {
            eventKey: due[index].eventKey,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          },
        ]
      : [],
  );
  if (failures.length) {
    log('error', 'One or more current events failed to refresh', { failures });
    throw new Error(
      `Scheduled TBA refresh failed for ${failures.map((item) => item.eventKey).join(', ')}`,
    );
  }
  return { attempted: due.length, refreshed: results.length };
}
