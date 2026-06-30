import { CompressionCodecs, CompressionTypes } from 'kafkajs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { codec: lz4Codec } = require('kafka-lz4-lite') as {
  codec: () => {
    compress: (encoder: { buffer: Buffer }) => Buffer;
    decompress: (buffer: Buffer) => Buffer;
  };
};

CompressionCodecs[CompressionTypes.LZ4] = lz4Codec;
