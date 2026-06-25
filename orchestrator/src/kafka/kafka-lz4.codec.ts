/**
 * Registers the LZ4 compression codec with KafkaJS (Master Plan §6.2 Step 1.4).
 *
 * KafkaJS ships with GZIP built-in only. LZ4 requires a pluggable codec.
 *
 * Codec choice on Windows/Node 22 (Subtask 7 boot check):
 * - `kafkajs-lz4` → lz4-asm WASM failed ("fetch failed / unknown scheme")
 * - native `lz4` → needs Visual Studio C++ toolset (node-gyp rebuild failed)
 * - `kafka-lz4-lite` → pure JS (lz4-lite), no native build — works on this dev machine
 *
 * Import this file once (side effect) before creating any Kafka producer.
 */
import { CompressionCodecs, CompressionTypes } from 'kafkajs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { codec: lz4Codec } = require('kafka-lz4-lite') as {
  codec: () => {
    compress: (encoder: { buffer: Buffer }) => Buffer;
    decompress: (buffer: Buffer) => Buffer;
  };
};

CompressionCodecs[CompressionTypes.LZ4] = lz4Codec;
