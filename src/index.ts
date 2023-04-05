import fastify from 'fastify'
import { v3 } from 'node-hue-api';
import { Api as HueApi } from 'node-hue-api/dist/esm/api/Api';

import * as config from './config';
import * as time from './time';

const log = (...args: any[]) => {
  console.log(new Date(), ...args);
}

type LightServiceState = 
  | 'pre-wake-up'
  | 'waked-up'
  | 'pre-sleep'
  | 'slept'
  | 'waked-up-early'
  | 'slept-early';

const getNextState = (stateBefore: LightServiceState, now: number): LightServiceState => {
  switch (stateBefore) {
    case 'waked-up-early':
      if (time.tIn(time.tSubAbs(config.BEDTIME, config.PRE_DELTA), config.BEDTIME, now)) {
        return 'pre-sleep';
      }
      return 'waked-up-early';
    case 'slept-early':
      if (time.tIn(time.tSubAbs(config.WAKE_UP_TIME, config.PRE_DELTA), config.WAKE_UP_TIME, now)) {
        return 'pre-wake-up';
      }
      return 'slept-early';
    default:
      if (time.tIn(time.tSubAbs(config.BEDTIME, config.PRE_DELTA), config.BEDTIME, now)) {
        return 'pre-sleep';
      }
      if (time.tIn(config.BEDTIME, time.tSubAbs(config.WAKE_UP_TIME, config.PRE_DELTA), now)) {
        return 'slept';
      }
      if (time.tIn(time.tSubAbs(config.WAKE_UP_TIME, config.PRE_DELTA), config.WAKE_UP_TIME, now)) {
        return 'pre-wake-up';
      }
      if (time.tIn(config.WAKE_UP_TIME, time.tSubAbs(config.BEDTIME, config.PRE_DELTA), now)) {
        return 'waked-up';
      }
      return stateBefore;
  }
}

const getBrightness = (state: LightServiceState, now: number): number => {
  switch (state) {
    case 'waked-up-early':
    case 'waked-up':
      return 1;
    case 'pre-sleep':
      return Math.max(1 - (now - time.tSubAbs(config.BEDTIME, config.PRE_DELTA)) / config.PRE_DELTA, config.BRIGHTNESS_MIN);
    case 'slept-early':
    case 'slept':
      return config.BRIGHTNESS_MIN;
    case 'pre-wake-up':
      return Math.max((now - time.tSubAbs(config.WAKE_UP_TIME, config.PRE_DELTA)) / config.PRE_DELTA, config.BRIGHTNESS_MIN);
  }
}

const getCool = (state: LightServiceState, now: number): number => {
  switch (state) {
    case 'waked-up-early':
    case 'waked-up':
      return 1;
    case 'pre-sleep':
      return Math.max(1 - (now - time.tSubAbs(config.BEDTIME, config.PRE_DELTA)) / config.PRE_DELTA, config.BRIGHTNESS_MIN);
    case 'slept-early':
    case 'slept':
      return config.BRIGHTNESS_MIN;
    case 'pre-wake-up':
      return Math.max((now - time.tSubAbs(config.WAKE_UP_TIME, config.PRE_DELTA)) / config.PRE_DELTA, config.BRIGHTNESS_MIN);
  }
}

class HueLightService {
  private state: LightServiceState;
  private brightness: number; // 1: bright, 0: dark
  private cool: number; // 1: cool, 0: warm

  constructor (private readonly hueApi: HueApi) {
    const now = time.tAbs(time.nowTimezone(config.TIME_OFFECT) % time.DAY);
    this.state = getNextState('waked-up', now)
    this.brightness = getBrightness(this.state, now);
    this.cool = getCool(this.state, now);
  }

  updateStateAndBrightness() {
    const now = time.tAbs(time.nowTimezone(config.TIME_OFFECT) % time.DAY);
    this.state = getNextState(this.state, now);
    this.brightness = getBrightness(this.state, now);
    this.cool = getCool(this.state, now);
  }

  async writeStateAndBrightnessToApi() {
    // https://developers.meethue.com/develop/get-started-2/core-concepts/#controlling-light
    const hueBri = this.brightness * 254
    const hueBriSafe = Math.min(Math.max(hueBri, 1), 254);

    const hueCt = config.CT_MAX - this.cool * (config.CT_MAX - config.CT_MIN);
    const hueCtSafe = Math.min(Math.max(hueCt, 153), 500);

    const lights = await this.hueApi.lights.getAll();
    return Promise.all(lights.map(async (light) => {
      return this.hueApi.lights.setLightState(
        light.id,
        {
          on: true,
          bri: hueBriSafe,
          ct: hueCtSafe,
        }
      );
    }));
  }

  async tick() {
    log(this.state, this.brightness, this.cool)
    this.updateStateAndBrightness();
    await this.writeStateAndBrightnessToApi();
  }

  wakeUpNow() {
    this.state = 'waked-up-early';
  }

  sleepNow() {
    this.state = 'slept-early';
  }
}

const main = async () => {
  try {
    const server = fastify()

    const hueApi = await v3.api.createLocal(config.HUE_HOST).connect(config.HUE_USERNAME, config.HUE_CLIENTKEY);
    const lightService = new HueLightService(hueApi);

    setInterval(async () => { await lightService.tick(); }, config.TICK_INTERVAL);

    server.post('/wake-up', async (request, reply) => {
      lightService.wakeUpNow();
      await lightService.tick();
    })

    server.post('/sleep', async (request, reply) => {
      lightService.sleepNow();
      await lightService.tick();
    })

    await server.listen({ host: config.HOST, port: config.PORT })
  } catch (e) {
    log(e);
    process.exit(1);
  }
}

main();