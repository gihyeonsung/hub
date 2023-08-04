import { Api as HueApi } from "node-hue-api/dist/esm/api/Api";

import { log } from './logger'
import { tAbs, nowTimezone } from "./time";

const HUE_CT_MAX = 500;
const HUE_CT_MIN = 153;

export class HueLightService {
  private brightness: number = 1; // 1: bright, 0: dark
  private cool: number = 1; // 1: cool, 0: warm

  constructor(
    private readonly hueApi: HueApi,
    private readonly timezoneOffset: number,
    private readonly scenes: { time: number, brightness: number; cool: number; }[]
  ) {}

  updateState(): void {
    const now = tAbs(nowTimezone(this.timezoneOffset));

    const scenes = [...this.scenes].sort((s0, s1) => s0.time - s1.time);
    const nextIndex = scenes.findIndex((s) => s.time > now)
    if (nextIndex === -1) throw new Error('not found next scene')

    const next = scenes[nextIndex];
    const prev = scenes.at(nextIndex - 1)
    if (prev === undefined) throw new Error('not found prev scene')

    this.brightness = (prev.brightness + next.brightness) / 2
    this.cool = (prev.cool + next.cool) / 2
  }

  async writeState() {
    const lights = await this.hueApi.lights.getAll();
    if (this.brightness === 0) {
      return Promise.all(
        lights.map(async (light) => {
          return this.hueApi.lights.setLightState(light.id, { on: false });
        })
      );
    }

    // https://developers.meethue.com/develop/get-started-2/core-concepts/#controlling-light
    const hueBri = this.brightness * 254;
    const hueBriSafe = Math.min(Math.max(hueBri, 1), 254);

    const hueCt = HUE_CT_MAX - this.cool * (HUE_CT_MAX - HUE_CT_MIN);
    const hueCtSafe = Math.min(Math.max(hueCt, 153), 500);

    return Promise.all(
      lights.map(async (light) => {
        return this.hueApi.lights.setLightState(light.id, {
          on: true,
          bri: hueBriSafe,
          ct: hueCtSafe,
        });
      })
    );
  }

  async tick() {
    this.updateState();
    log(this.brightness, this.cool);

    await this.writeState();
  }
}
