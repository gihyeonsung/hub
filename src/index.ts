import { v3 } from 'node-hue-api';
import { Api as HueApi } from 'node-hue-api/dist/esm/api/Api';
import * as config from './config';
import * as time from './time';

const log = (...args: any[]) => {
  console.log(new Date(), ...args);
}

type LightServiceState = 
  | 'wake-up-inprogress'
  | 'waked-up'
  | 'sleep-inprogress'
  | 'slept'
  | 'waked-up-early'
  | 'slept-early';

const getNextState = (stateBefore: LightServiceState, now: number): LightServiceState => {
  switch (stateBefore) {
    case 'waked-up-early':
      if (time.tIn(time.tSubAbs(config.BEDTIME, 30 * time.MINUTE), time.tAddAbs(config.BEDTIME, 30 * time.MINUTE), now)) {
        return 'sleep-inprogress';
      }
      return 'waked-up-early';
    case 'slept-early':
      if (time.tIn(time.tSubAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), time.tAddAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), now)) {
        return 'wake-up-inprogress';
      }
    default:
      if (time.tIn(time.tSubAbs(config.BEDTIME, 30 * time.MINUTE), time.tAddAbs(config.BEDTIME, 30 * time.MINUTE), now)) {
        return 'sleep-inprogress';
      }
      if (time.tIn(time.tAddAbs(config.BEDTIME, 30 * time.MINUTE), time.tSubAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), now)) {
        return 'slept';
      }
      if (time.tIn(time.tSubAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), time.tAddAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), now)) {
        return 'wake-up-inprogress';
      }
      if (time.tIn(time.tAddAbs(config.WAKE_UP_TIME, 30 * time.MINUTE), time.tSubAbs(config.BEDTIME, 30 * time.MINUTE), now)) {
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
    case 'sleep-inprogress':
      return Math.max(1 - (now - time.tSubAbs(config.BEDTIME, 30 * time.MINUTE)) / time.HOUR, config.BRIGHTNESS_MIN);
    case 'slept-early':
    case 'slept':
      return config.BRIGHTNESS_MIN;
    case 'wake-up-inprogress':
      return Math.max((now - time.tSubAbs(config.WAKE_UP_TIME, 30 * time.MINUTE)) / time.HOUR, config.BRIGHTNESS_MIN);
  }
}

class HueLightService {
  private state: LightServiceState;
  private brightness: number;

  constructor (private readonly hueApi: HueApi) {
    const now = time.tAbs(time.nowTimezone(config.TIME_OFFECT) % time.DAY);
    this.state = getNextState('waked-up', now)
    this.brightness = getBrightness(this.state, now);
  }

  updateStateAndBrightness() {
    const now = time.tAbs(time.nowTimezone(config.TIME_OFFECT) % time.DAY);
    this.state = getNextState(this.state, now);
    this.brightness = getBrightness(this.state, now);
  }

  async writeStateAndBrightnessToApi() {
    // https://developers.meethue.com/develop/get-started-2/core-concepts/#controlling-light
    const brightness = Math.min(Math.max(this.brightness * 254, 1), 254);
    const lights = await this.hueApi.lights.getAll();
    return Promise.all(lights.map(async (light) => {
      return this.hueApi.lights.setLightState(light.id, { on: true, bri: brightness });
    }));
  }

  async tick() {
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
    const hueApi = await v3.api.createLocal(config.HUE_HOST).connect(config.HUE_USERNAME, config.HUE_CLIENTKEY);
    const lightService = new HueLightService(hueApi);
    setInterval(async () => { await lightService.tick(); }, 1 * time.MINUTE);
  } catch (e) {
    log(e);
    process.exit(1);
  }
}

main();