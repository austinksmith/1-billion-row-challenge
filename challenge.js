const fs = require('fs');
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

const chunkSize = 32 * 1024 * 1024; // 32 MB
let processedLinesCount = 0; // Track total lines processed
const totalLines = 1000000000; // Predefined total lines in the file

// Progress bar settings
const progressBarLength = 50; // Length of the progress bar in characters

function progressBar(progress) {
  const percentage = Math.min(100, Math.round(progress * 100));
  const progressLength = Math.min(progressBarLength, Math.round(progressBarLength * progress));
  const bar = '='.repeat(progressLength) + '-'.repeat(progressBarLength - progressLength);
  process.stdout.write(`\r[${bar}] ${percentage}%`);
}

async function processTypedArray(typedArray) {
  const params = {
    array: typedArray,
    dataType: 'Uint8',
    threads: hamsters.maxThreads, // Adjust the number of threads as needed
  };

  const output = await hamsters.promise(params, function () {
    const decoder = new TextDecoder();
    const array = decoder.decode(params.array).split('\n');
    rtn.data = [];
    for (var i = 0; i < array.length; i++) {
      parseLine(array[i]);
    }

    function parseLine(line) {
      const parts = line.split(';');
      const station = parts[0];
      const temperature = parseFloat(parts[1]);
      rtn.data.push({ station, temperature });
    }
  });

  processOutput(output);

  // Increment lines counted by the number of lines processed
  processedLinesCount += output.length;

  // Update progress bar
  progressBar(processedLinesCount / totalLines);
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
  const stream = fs.createReadStream(filename, { highWaterMark: chunkSize });
  let partialLine = '';

  stream.on('data', async (chunk) => {
    const typedArray = new Uint8Array(chunk);
    const decoder = new TextDecoder();
    const data = decoder.decode(typedArray);
    const lines = (partialLine + data).split('\n');
    partialLine = lines.pop(); // Save incomplete line fragment

    // Convert the lines to a TypedArray without reconversion
    const newTypedArray = new TextEncoder().encode(lines.join('\n'));
    await processTypedArray(newTypedArray);
  });

  stream.on('end', async () => {
    // Process any remaining lines in the buffer
    if (partialLine) {
      const finalTypedArray = new TextEncoder().encode(partialLine);
      await processTypedArray(finalTypedArray); // Process the final partial line
    }
    console.log('\nProcessing completed.');
    console.timeEnd('Total Processing Time'); // End timing for entire processing
    printData();
  });

  stream.on('error', (err) => {
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
