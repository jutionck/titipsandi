export const DEFAULT_PASSWORD_REVIEW_DAYS = 180;

export type PasswordHealthInput = {
  id: string;
  title: string;
  password: string;
  passwordUpdatedAt?: string;
  createdAt: string;
};

export type PasswordHealthStatus = "risk" | "review" | "good";

export type PasswordHealthEntry = {
  id: string;
  title: string;
  score: number;
  status: PasswordHealthStatus;
  weak: boolean;
  reused: boolean;
  reviewDue: boolean;
  ageDays: number;
  reasons: string[];
};

export type PasswordHealthReport = {
  total: number;
  risk: number;
  review: number;
  good: number;
  weak: number;
  reused: number;
  entries: PasswordHealthEntry[];
};

type PasswordHealthOptions = {
  now?: Date;
  reviewAfterDays?: number;
};

const COMMON_PATTERNS =
  /(1234|abcd|admin|iloveyou|letmein|password|qwerty|welcome|sayang|rahasia)/iu;

function passwordLength(password: string) {
  return [...password].length;
}

function containsServiceName(password: string, title: string) {
  const normalizedTitle = title.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/gu, "");
  const normalizedPassword = password.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/gu, "");
  return normalizedTitle.length >= 4 && normalizedPassword.includes(normalizedTitle);
}

function strength(password: string, title: string) {
  const length = passwordLength(password);
  const obvious =
    COMMON_PATTERNS.test(password) ||
    /^(.)\1+$/u.test(password) ||
    containsServiceName(password, title);

  if (length < 6 || obvious) return 0;
  if (length < 10) return 1;
  if (length < 14) return 2;
  if (length < 20) return 3;
  return 4;
}

function passwordAgeDays(input: PasswordHealthInput, now: Date) {
  const candidate = input.passwordUpdatedAt || input.createdAt;
  const updatedAt = new Date(candidate);
  if (Number.isNaN(updatedAt.getTime()) || updatedAt > now) return 0;
  return Math.floor((now.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
}

export function analyzeVaultPasswords(
  inputs: PasswordHealthInput[],
  options: PasswordHealthOptions = {},
): PasswordHealthReport {
  const now = options.now ?? new Date();
  const reviewAfterDays = options.reviewAfterDays ?? DEFAULT_PASSWORD_REVIEW_DAYS;
  const reuseCounts = new Map<string, number>();

  for (const input of inputs) {
    reuseCounts.set(input.password, (reuseCounts.get(input.password) || 0) + 1);
  }

  const entries = inputs.map<PasswordHealthEntry>((input) => {
    const score = strength(input.password, input.title);
    const weak = score <= 1;
    const reusedCount = reuseCounts.get(input.password) || 0;
    const reused = Boolean(input.password) && reusedCount > 1;
    const ageDays = passwordAgeDays(input, now);
    const reviewDue = ageDays >= reviewAfterDays;
    const reasons: string[] = [];

    if (weak) {
      reasons.push(
        passwordLength(input.password) < 10
          ? "Password terlalu pendek atau mudah ditebak"
          : "Password mengandung pola yang mudah ditebak",
      );
    }
    if (reused) {
      reasons.push(`Password yang sama dipakai pada ${reusedCount} entry`);
    }
    if (reviewDue) {
      reasons.push(`Belum ditinjau selama ${ageDays} hari`);
    }

    return {
      id: input.id,
      title: input.title,
      score,
      status: weak || reused ? "risk" : reviewDue ? "review" : "good",
      weak,
      reused,
      reviewDue,
      ageDays,
      reasons,
    };
  });

  return {
    total: entries.length,
    risk: entries.filter((entry) => entry.status === "risk").length,
    review: entries.filter((entry) => entry.status === "review").length,
    good: entries.filter((entry) => entry.status === "good").length,
    weak: entries.filter((entry) => entry.weak).length,
    reused: entries.filter((entry) => entry.reused).length,
    entries: entries.sort((left, right) => {
      const priority = { risk: 0, review: 1, good: 2 };
      return priority[left.status] - priority[right.status] || right.ageDays - left.ageDays;
    }),
  };
}
