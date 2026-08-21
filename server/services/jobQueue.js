// Background Job Worker Queue for Non-Blocking Operations
const realtimeService = require('./realtimeService');

class JobQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  addJob(name, handlerData) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      handlerData,
      status: 'QUEUED',
      createdAt: new Date()
    };
    this.queue.push(job);
    console.log(`[BACKGROUND JOB QUEUED] ${job.name} (ID: ${job.id})`);
    
    realtimeService.broadcast('JOB_QUEUED', { jobId: job.id, name: job.name });
    this.processQueue();
    return job;
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const currentJob = this.queue.shift();
      currentJob.status = 'PROCESSING';
      realtimeService.broadcast('JOB_PROCESSING', { jobId: currentJob.id, name: currentJob.name });

      try {
        console.log(`[BACKGROUND JOB RUNNING] ${currentJob.name}...`);
        if (typeof currentJob.handlerData === 'function') {
          await currentJob.handlerData();
        }
        currentJob.status = 'COMPLETED';
        realtimeService.broadcast('JOB_COMPLETED', { jobId: currentJob.id, name: currentJob.name });
      } catch (err) {
        currentJob.status = 'FAILED';
        currentJob.error = err.message;
        console.error(`[BACKGROUND JOB FAILED] ${currentJob.name}: ${err.message}`);
        realtimeService.broadcast('JOB_FAILED', { jobId: currentJob.id, error: err.message });
      }
    }

    this.isProcessing = false;
  }
}

module.exports = new JobQueue();
