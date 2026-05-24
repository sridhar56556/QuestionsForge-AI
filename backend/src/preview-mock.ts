import { randomUUID } from 'crypto';

export let isPreviewMode = false;
export const setPreviewMode = () => { isPreviewMode = true; };

export const MockDB = {
  assignments: new Map<string, any>(),
  papers: new Map<string, any>(),
};

type JobHandler = (arg: { data: any }) => Promise<void>;
let registeredHandler: JobHandler | null = null;

export const MockQueue = {
  register(handler: JobHandler) {
    registeredHandler = handler;
  },
  async add(jobName: string, data: any) {
    // Run async to simulate queue
    setTimeout(() => {
      if (registeredHandler) {
        registeredHandler({ data }).catch(console.error);
      } else {
        console.warn('No registered queue handler for mock/fallback mode');
      }
    }, 1000);
  }
};
