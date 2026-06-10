// FIFA 3-letter -> ISO 3166-1 alpha-2 for flag CDN
export const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BRA: "br", CAN: "ca",
  CIV: "ci", COL: "co", CRC: "cr", CRO: "hr", DEN: "dk", ECU: "ec", EGY: "eg",
  ENG: "gb-eng", ESP: "es", FRA: "fr", GER: "de", GHA: "gh", IRN: "ir",
  ITA: "it", JAM: "jm", JOR: "jo", JPN: "jp", KOR: "kr", KSA: "sa", MAR: "ma",
  MEX: "mx", NED: "nl", NGA: "ng", NOR: "no", NZL: "nz", PAN: "pa", PAR: "py",
  POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct", SEN: "sn", SRB: "rs",
  SUI: "ch", TUN: "tn", TUR: "tr", UKR: "ua", URU: "uy", USA: "us", UZB: "uz",
  WAL: "gb-wls",
};

export function flagUrl(code?: string | null, size: 20 | 40 | 80 | 160 = 40): string | null {
  if (!code) return null;
  const iso = FIFA_TO_ISO2[code.toUpperCase()];
  if (!iso) return null;
  const w = size;
  return `https://flagcdn.com/w${w}/${iso}.png`;
}