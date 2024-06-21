const fs = require('fs');
const readline = require('readline');
const { Worker, parentPort } = require('worker_threads');
const hamsters = require('hamsters.js');

class Station {
  constructor() {
    this.min = Infinity;
    this.sum = 0;
    this.max = -Infinity;
    this.count = 0;
  }

  addTemperature(temp) {
    if (temp < this.min) {
      this.min = temp;
    }
    if (temp > this.max) {
      this.max = temp;
    }
    this.sum += temp;
    this.count++;
  }

  averageTemperature() {
    if (this.count === 0) {
      return 0; // avoid division by zero
    }
    return this.sum / this.count;
  }
}

const stations = {};

let buffer = [];
const bufferSize = 250000; // Adjust the buffer size as needed
let processedLinesCount = 0; // Track total lines processed

async function processBuffer(bufferToProcess) {
  const params = {
    array: bufferToProcess,
    threads: hamsters.maxThreads, // Adjust the number of threads as needed
  };

  const output = await hamsters.promise(params, function () {
    rtn.data = [];
    for (var i = 0; i < params.array.length; i++) {
      parseLine(params.array[i]);
    }

    function parseLine(line) {
      const parts = line.split(';');
      const station = parts[0];
      const temperature = parseFloat(parts[1]);
      rtn.data.push({ station, temperature });
    }
  });

  processOutput(output);
}

function processOutput(output) {
  for (let i = 0; i < output.length; i++) {
    const { station, temperature } = output[i];
    if (!stations[station]) {
      stations[station] = new Station();
    }
    stations[station].addTemperature(temperature);
  }
}


function processData(filename) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filename),
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    buffer.push(line);
    processedLinesCount++;

    // Process data when the buffer size is a multiple of bufferSize
    if (buffer.length >= bufferSize && buffer.length % bufferSize === 0) {
      const bufferToProcess = buffer.slice(0, bufferSize);
      buffer = buffer.slice(bufferSize); // Remove processed lines from buffer immediately
      processBuffer(bufferToProcess); // Process the chunk
    }
  });

  rl.on('close', async () => {
    // Process any remaining lines in the buffer
    while (buffer.length > 0) {
      const bufferToProcess = buffer.slice(0, bufferSize);
      buffer = buffer.slice(bufferSize); // Remove processed lines from buffer immediately
      await processBuffer(bufferToProcess); // Process the chunk
    }
    console.timeEnd('Total Processing Time'); // End timing for entire processing
    printData();
  });

  rl.on('error', (err) => {
    console.error('Error reading file:', err);
  });
}

function printData() {
  // Sort stations alphabetically by station name
  const sortedStations = Object.keys(stations).sort();

  process.stdout.write('{');
  sortedStations.forEach((station, index) => {
    const stats = stations[station];
    const avgTemp = stats.averageTemperature();
    process.stdout.write(`${station}=${stats.min.toFixed(1)}/${avgTemp.toFixed(1)}/${stats.max.toFixed(1)}`);
    if (index < sortedStations.length - 1) {
      process.stdout.write(',');
    }
  });
  process.stdout.write('}\n');
}

hamsters.init({
  Worker: Worker,
  parentPort: parentPort,
  maxThreads: 8,
  persistence: false,
});

console.time('Total Processing Time'); // Start timing for entire processing
// Replace 'measurements.txt' with your actual filename
processData('measurements.txt');
