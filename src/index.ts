// SPDX-FileCopyrightText: Copyright 2024 Rifa Achrinza
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-or-later
// SPDX-FileNoticeText: <text>
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License, v. 2.0 are satisfied: GNU General Public License, version 2
// which is available at https://www.gnu.org/licenses/gpl-2.0.html
// </text>
import {SAXParser} from './xml-parser';
import {ReadableStream} from 'node:stream/web';
import {performance} from 'node:perf_hooks';

const LOOPS = 1;
const parser = new SAXParser();

parser.on('startDocument', () => console.log('Event: startDocument'));
parser.on('xmlDeclaration', payload => {
  console.group('Event: xmlDeclaration');
  console.group('Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.groupEnd();
  console.groupEnd();
});
parser.on('endDocument', () => console.log('Event: endDocument'));

function createReadableStream() {
  return new ReadableStream({
  start(controller) {
    controller.enqueue('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
  },
  pull(controller) {
    controller.close();
  },
});
}

(async () => {
  const start = performance.now();
  for (let i=0; i<LOOPS; i++) {
    var stream = createReadableStream();
    await parser.parse(stream);
  }
  const end = performance.now();
  console.log('Total time taken: \t' + (end-start).toString() + 'ms');
  console.log('Unit time taken: \t' + ((end-start)/LOOPS).toString() + 'ms');
})();
