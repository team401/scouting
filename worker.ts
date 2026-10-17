import application from 'vinext/server/fetch-handler';
import { runScheduledTbaRefresh } from '@/lib/scheduled-tba-refresh';

const handler = application as ExportedHandler;

export default {
  ...handler,
  scheduled(controller, _environment, context) {
    context.waitUntil(runScheduledTbaRefresh(controller.scheduledTime));
  },
} satisfies ExportedHandler;
