export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const nowTimezone = (timeOffset: number): number => {
  return Date.now() + timeOffset;
}

export const tAbs = (t: number): number => {
  if (t >= DAY) {
    // 24:30 -> 00:30
    return t % DAY;
  } else if (t < 0) {
    // -00:30 -> 23:30
    return DAY - ((-t) % DAY);
  } else {
    // 12:00 -> 12:00
    return t;
  }
}

// 12:00 + 00:30 => 12:30
// 23:30 + 01:00 => 00:30
export const tAddAbs = (t: number, delta: number): number => {
  return tAbs(t + delta);
}

// 12:00 - 00:30 => 11:30
// 00:30 - 01:00 => 23:30
export const tSubAbs = (t: number, delta: number): number => {
  return tAbs(t - delta);
}

export const tIn = (start: number, end: number, t: number): boolean => {
  // 23:30 ~ 00:30
  if (start > end) {
    return start <= t || t <= end;
  // 22:30 ~ 23:30
  } else {
    return start <= t && t <= end;
  }
}
