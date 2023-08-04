import { fastify } from "fastify";
import { v3 } from "node-hue-api";

import { ConfigRepo } from "./config.repo";
import { HueLightService } from "./hue-light.service";
import { log } from "./logger";
import { HOUR } from "./time";


const main = async () => {
  try {
    const configRepo = new ConfigRepo('./config.json');
    const config = await configRepo.load();

    const hueApi = await v3.api.createLocal(config.hueHost).connect(config.hueUsername, config.hueClientKey);
    const lightService = new HueLightService(hueApi, 9 * HOUR, config.scenes);

    setInterval(async () => {
      await lightService.tick();
    }, config.tickInterval);
  } catch (e) {
    log(e);
    process.exit(1);
  }
};

main();
