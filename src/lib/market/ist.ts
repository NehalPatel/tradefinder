const IST = "Asia/Kolkata";

function istParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour") === "24" ? "0" : get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: get("weekday"),
  };
}

const WEEKDAY_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function minutesFromMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function getMarketStatus(date = new Date()): {
  status: "open" | "closed" | "preopen";
  marketOpen: boolean;
  sessionDate: string;
  minutesSinceOpen: number;
  sessionProgress: number;
} {
  const p = istParts(date);
  const day = WEEKDAY_TO_JS[p.weekday] ?? date.getUTCDay();
  const mins = minutesFromMidnight(p.hour, p.minute);
  const openMins = 9 * 60 + 15;
  const closeMins = 15 * 60 + 30;
  const preOpenStart = 9 * 60;
  const sessionLength = closeMins - openMins;

  const sessionDate = [
    p.year,
    String(p.month).padStart(2, "0"),
    String(p.day).padStart(2, "0"),
  ].join("-");

  if (day === 0 || day === 6) {
    return {
      status: "closed",
      marketOpen: false,
      sessionDate,
      minutesSinceOpen: 0,
      sessionProgress: 0,
    };
  }

  if (mins >= openMins && mins <= closeMins) {
    const since = mins - openMins;
    return {
      status: "open",
      marketOpen: true,
      sessionDate,
      minutesSinceOpen: since,
      sessionProgress: Math.min(1, Math.max(0, since / sessionLength)),
    };
  }

  if (mins >= preOpenStart && mins < openMins) {
    return {
      status: "preopen",
      marketOpen: false,
      sessionDate,
      minutesSinceOpen: 0,
      sessionProgress: 0,
    };
  }

  return {
    status: "closed",
    marketOpen: false,
    sessionDate,
    minutesSinceOpen: mins > closeMins ? sessionLength : 0,
    sessionProgress: mins > closeMins ? 1 : 0,
  };
}

export function formatISTTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatISTDateTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** YYYY-MM-DD in Asia/Kolkata */
export function istDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatISTClock(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
