    const path = require('path');
    const { Worker, parentPort} = require('worker_threads');
    const readline = require('readline');
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
    const totalLines = 1000000000;
    const startTime = Date.now();

    // Split the file by line count for each worker
    const linesPerWorker = Math.ceil(totalLines / workerCount);
    const indexes = [];

    // Precalculate indexes
    for (let i = 0; i < workerCount; i++) {
        const startLine = i * linesPerWorker;
        const endLine = Math.min((i + 1) * linesPerWorker, totalLines); // Ensure the last worker doesn't exceed total lines
        indexes.push({start: startLine, end: endLine});
    }
    const params = {
        array: [0,1,2,3,4,5,6,7],
        indexes: indexes,
        inputFile: inputFile,
        threads: 8
    };
    hamsters.run(params, function() {
        console.log("We have prepared the params!");
    }, function(results) {
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000; // Time in seconds
        console.log(`Processing Completed in ${totalTime}!`);
    }, function(error) {
        console.log(error);
    });

    // Function to update progress bar
    function updateProgressBar(processed, total) {
        const percentage = ((processed / total) * 100).toFixed(2);
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`Progress: ${percentage}%`);
    }
