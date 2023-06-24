import * as process from "process";

export default {
  TICK_INTERVAL: Number(process.env.TICK_INTERVAL),
  HOST: process.env.HOST || "",
  PORT: Number(process.env.PORT),

  HUE_HOST: process.env.HUE_HOST || "",
  HUE_USERNAME: process.env.HUE_USERNAME || "",
  HUE_CLIENTKEY: process.env.HUE_CLIENTKEY || "",

  WAKE_UP_TIME: Number(process.env.WAKE_UP_TIME),
  BEDTIME: Number(process.env.BEDTIME),
  TIME_OFFECT: Number(process.env.TIME_OFFECT),

  PRE_DELTA: Number(process.env.PRE_DELTA),

  BRIGHTNESS_MIN: Number(process.env.BRIGHTNESS_MIN),
  COOL_MAX: Number(process.env.COOL_MAX),

  CT_MAX: Number(process.env.CT_MAX),
  CT_MIN: Number(process.env.CT_MIN),
};
