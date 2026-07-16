const WINDOWS_DRIVE_ABSOLUTE_PATH = /(^|[^A-Za-z0-9+.-])([A-Za-z]:[\\/][^\s"'<>|]*)/gm;
const WINDOWS_UNC_ABSOLUTE_PATH = /\\\\[^\\/\s"'<>|]+[\\/][^\\/\s"'<>|]+(?:[\\/][^\s"'<>|]+)*/g;
const FILE_URL_ABSOLUTE_PATH = /\bfile:\/\/[^\s"'<>|]*/gi;
const POSIX_ABSOLUTE_PATH = /(^|[^A-Za-z0-9_./-])\/(?!\/)[^\s"'<>|]*/gm;

export function containsHostAbsolutePath(value: string): boolean {
  return redactHostAbsolutePaths(value) !== value;
}

export function redactHostAbsolutePaths(value: string): string {
  return value
    .replace(FILE_URL_ABSOLUTE_PATH, "<host-path>")
    .replace(WINDOWS_UNC_ABSOLUTE_PATH, "<host-path>")
    .replace(WINDOWS_DRIVE_ABSOLUTE_PATH, (_match, prefix: string) => `${prefix}<host-path>`)
    .replace(POSIX_ABSOLUTE_PATH, (_match, prefix: string) => `${prefix}<host-path>`);
}
