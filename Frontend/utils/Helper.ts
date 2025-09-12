export async function copyTextToClipboard(text: string): Promise<void | boolean> {
  if ("clipboard" in navigator) {
    return await navigator.clipboard.writeText(text);
  } else {
    return document.execCommand("copy", true, text);
  }
}
