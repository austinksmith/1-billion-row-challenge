const { parentPort } = require('worker_threads');
const fs = require('fs');

global.params = {};
global.rtn = {};

parentPort.on('message', async (message) => {
  params = message;
  rtn = {
    data: [],
    dataType: (typeof params.dataType !== 'undefined' ? params.dataType : null),
    index: params.index
  };

  if (params.sharedBuffer) {
    params.sharedArray = typedArrayFromBuffer(params.dataType, params.sharedBuffer);
  }
  eval(params.hamstersJob);
  await processLines(params);
  returnResponse(rtn);
});

const processLines = async function(params) {
  const inputFile = params.inputFile;
  const startByte = params.index.start;
  const endByte = params.index.end;

  const fd = fs.openSync(inputFile, 'r');

  const locations = new Map();
  let currentPosition = startByte;

  // Loop to read until the end byte is reached
  while (currentPosition < endByte) {
    const chunkSize = Math.min(64 * 1024, endByte - currentPosition); // Read in 64 KB chunks
    const buffer = Buffer.alloc(chunkSize);
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, currentPosition);
    currentPosition += bytesRead;

    // Convert buffer to string and split by lines
    const data = buffer.toString();
    const lines = data.split('\n');

    // Process lines
    for (let i = 0; i < lines.length; i++) {
      if (currentPosition - bytesRead + i < startByte) {
        continue; // Skip lines before startByte
      }
      if (currentPosition - bytesRead + i >= endByte) {
        break; // Stop processing when reaching endByte
      }

      // Process the line (e.g., temperature and location parsing)
      const line = lines[i];
      if (line.trim()) {
        const index = line.indexOf(';');
        if (index !== -1) {
          const name = line.substring(0, index);
          const temp = parseFloat(line.substring(index + 1));

          if (!locations.has(name)) {
            locations.set(name, { count: 1, min: temp, max: temp, total: temp });
          } else {
            const loc = locations.get(name);
            loc.count++;
            loc.total += temp;
            loc.min = Math.min(loc.min, temp);
            loc.max = Math.max(loc.max, temp);
          }
        }
      }
    }
  }

  // Notify the main thread that the worker is done
  rtn.data = locations // Send data back to main thread
  fs.closeSync(fd); // Close the file descriptor
};


function returnResponse(rtn) {
  const buffers = getTransferableObjects(rtn);
  if (buffers.length > 0) {
    // If there are buffers, postMessage with transferable objects
    parentPort.postMessage(rtn, buffers);
  } else {
    // Otherwise, postMessage without transferable objects
    parentPort.postMessage(rtn);
  }
}

function typedArrayFromBuffer(dataType, buffer) {
  const types = {
    'Uint32': Uint32Array,
    'Uint16': Uint16Array,
    'Uint8': Uint8Array,
    'Uint8clamped': Uint8ClampedArray,
    'Int32': Int32Array,
    'Int16': Int16Array,
    'Int8': Int8Array,
    'Float32': Float32Array,
    'Float64': Float64Array
  };
  if (!types[dataType]) {
    return buffer;
  }
  return new types[dataType](buffer);
}

function getTransferableObjects(obj) {
  const transferableObjects = [];

  Object.entries(obj).forEach(([_, value]) => {
    // Check if the value is a typed array or DataView
    if (ArrayBuffer.isView(value)) {
      transferableObjects.push(value.buffer);  // Add buffer
    } else if (value instanceof ArrayBuffer) { // Check if object is an array buffer
      transferableObjects.push(value);  // Add object itself
    }
  });

  return transferableObjects;
}
