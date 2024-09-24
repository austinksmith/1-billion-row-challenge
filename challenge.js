const path = require('path');
const { Worker, parentPort} = require('worker_threads');
const readline = require('readline');
const fs = require('fs');
const hamsters = require('hamsters.js');
const cliProgress = require('cli-progress');

const progressBars = new cliProgress.MultiBar({
    format: 'Hamster {id} |{bar}| {percentage}% | {value}/{total}',
}, cliProgress.Presets.shades_classic);

const hamsterTrainer = (index, task, threadId, hamster, resolve, reject) => {
    this.hamsters = hamsters;
    const onThreadResponse = (message) => {
      var bar = bars[threadId];
      if(message.data.type === "progress") {
        var progress = message.data.progress;
        bar.update(parseFloat(progress));
    } else {
        this.hamsters.pool.processReturn(index, message, task);
        if (this.hamsters.habitat.debug) {
          task.scheduler.metrics.threads[threadId].completed_at = Date.now();
        }
        this.hamsters.pool.removeFromRunning(task, threadId);
        if (task.scheduler.workers.length === 0 && task.scheduler.count === task.scheduler.threads) {
          this.hamsters.pool.returnOutputAndRemoveTask(task, resolve);
        }
        if (!this.hamsters.habitat.persistence) {
          hamster.terminate();
        }
        if (this.hamsters.pool.pending.length() !== 0) {
          const queueHamster = this.hamsters.pool.fetchHamster(this.hamsters.pool.running.length());
          this.hamsters.pool.processQueuedItem(queueHamster, this.hamsters.pool.pending.shift());
        }
        bar.stop();
      }
    };
    this.hamsters.pool.setOnMessage(hamster, onThreadResponse, reject);
  }

  hamsters.init({
    debug: true,
    Worker: Worker,
    parentPort: parentPort,
    scaffold: path.resolve(__dirname, './custom.js'),
    trainer: hamsterTrainer,
    maxThreads: 8
});

const inputFile = path.resolve(__dirname, './measurements.txt');
const workerCount = hamsters.maxThreads; // Number of worker threads
const throttleInterval = 1000; // Progress update interval
const totalLines = 1000000000;
const startTime = Date.now();

// Split the file by line count for each worker
const linesPerWorker = Math.ceil(totalLines / workerCount);
const indexes = [];
const bars = [];
// Precalculate indexes
for (let i = 0; i < workerCount; i++) {
    const startLine = i * linesPerWorker;
    const endLine = Math.min((i + 1) * linesPerWorker, totalLines); // Ensure the last worker doesn't exceed total lines
    indexes.push({start: startLine, end: endLine});
    bars.push(progressBars.create(100, 0, {id: i}));

}

const params = {
    array: [0,1,2,3,4,5,6,7],
    indexes: indexes,
    mixedOutput: true,
    inputFile: inputFile,
    threads: workerCount,
    totalLines: linesPerWorker
};

hamsters.run(params, function() {
    
}, function(results) {
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // Time in seconds
    console.log(`Processing Completed in ${totalTime} seconds!`);
}, function(error) {
    console.log(error);
});
