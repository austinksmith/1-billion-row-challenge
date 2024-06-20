const fs = require('fs');
const readline = require('readline');

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

function parseLine(line) {
  const parts = line.split(';');
  const station = parts[0];
  const temperature = parseFloat(parts[1]);
  return { station, temperature };
}

function processData(filename) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filename),
    output: process.stdout,
    terminal: false
  });

  console.time('Parsing Time'); // Start timing

  rl.on('line', (line) => {
    const { station, temperature } = parseLine(line);
    if (!stations[station]) {
      stations[station] = new Station();
    }
    stations[station].addTemperature(temperature);
  });

  rl.on('close', () => {
    console.timeEnd('Parsing Time'); // End timing
    // printData();
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

// Replace 'measurements.txt' with your actual filename
processData('measurements.txt');
