const path = require('path');
const { Worker, parentPort } = require('worker_threads');
const fs = require('fs');
const hamsters = require('hamsters.js');

hamsters.init({
    debug: true,
    Worker: Worker,
    parentPort: parentPort,
    scaffold: path.resolve(__dirname, './custom.js'),
    maxThreads: 8
});

const inputFile = path.resolve(__dirname, './measurements.txt');
const workerCount = hamsters.maxThreads; // Number of worker threads
let processedLines = 0;
let lastProgressUpdate = Date.now();
const throttleInterval = 1000; // Progress update interval
const startTime = Date.now();

// Get the size of the file
const fileSize = fs.statSync(inputFile).size;

// Calculate byte ranges for each worker
const chunkSize = Math.ceil(fileSize / workerCount);
const indexes = [];

// Precalculate byte ranges for each worker
for (let i = 0; i < workerCount; i++) {
    const startByte = i * chunkSize;
    const endByte = Math.min(startByte + chunkSize, fileSize);
    indexes.push({ start: startByte, end: endByte });
}

const params = {
    array: [0, 1, 2, 3, 4, 5, 6, 7],
    indexes: indexes,
    inputFile: inputFile,
    mixedOutput: true,
    threads: workerCount
};

hamsters.run(params, async function () {
    console.log("We have prepared the params!");
}, function (results) {
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // Time in seconds
    console.log(`Processing Completed in ${totalTime} seconds!`);
}, function (error) {
    console.log(error);
});

// Function to update progress bar
function updateProgressBar(processed, total) {
    const percentage = ((processed / total) * 100).toFixed(2);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`Progress: ${percentage}%`);
}
