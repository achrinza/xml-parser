const {ReadableStream, WritableStream} = require('node:stream/web');
const {setInterval: every} = require('node:timers/promises');
const {performance} = require('node:perf_hooks');

const SECOND = 1000;

const stream = new ReadableStream({
  async start(controller) {
    for await (const _ of every(SECOND)) {
      controller.enqueue(performance.now());
    }
  }
});

const reader = new WritableStream({
  write(chunk) {
    console.log(chunk);
  }
})
/*
(async () => {
  for await (const value of stream) {
    console.log(value);
  }
})();
*/

stream.pipeTo(reader);
