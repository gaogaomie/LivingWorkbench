const firstUseGuideDismissedKey = "daily-life:first-use-guide-dismissed:v1";

export function readFirstUseGuideDismissed(): boolean {
  try {
    return window.localStorage.getItem(firstUseGuideDismissedKey) === "1";
  } catch {
    return false;
  }
}

export function dismissFirstUseGuide(): boolean {
  try {
    window.localStorage.setItem(firstUseGuideDismissedKey, "1");
    return true;
  } catch {
    return false;
  }
}
