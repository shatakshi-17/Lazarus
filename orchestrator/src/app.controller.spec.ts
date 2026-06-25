/**
 * Unit test for AppController (Jest + @nestjs/testing).
 *
 * Unit tests run in memory — no real HTTP server, no Kafka, no Docker.
 * We build a tiny Nest "testing module" with only the pieces under test.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  /**
   * beforeEach runs before every `it(...)` block.
   * Fresh module each time avoids tests leaking state into each other.
   */
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    // Ask the testing module for an instance of AppController (same as production DI).
    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
