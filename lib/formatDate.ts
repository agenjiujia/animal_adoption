import dayjs from "dayjs";

/** 年月日 + 时分秒 */
const DATETIME_YMD_HMS = "YYYY-MM-DD HH:mm:ss";

export function formatDateTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null || value === "") return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format(DATETIME_YMD_HMS) : String(value);
}
