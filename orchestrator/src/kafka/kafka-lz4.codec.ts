// kafka-lz4-lite — pure JS; kafkajs-lz4 WASM and native lz4 failed on Windows/Node 22 dev host.
// Side-effect registration — must run before any Kafka producer is constructed.
import { CompressionCodecs, CompressionTypes } from 'kafkajs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { codec: lz4Codec } = require('kafka-lz4-lite') as {
  codec: () => {
    compress: (encoder: { buffer: Buffer }) => Buffer;
    decompress: (buffer: Buffer) => Buffer;
  };
};

CompressionCodecs[CompressionTypes.LZ4] = lz4Codec;
