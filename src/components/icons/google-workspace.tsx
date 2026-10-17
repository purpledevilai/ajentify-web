/**
 * Simplified Google Workspace product marks, drawn in each product's brand
 * colours. Kept as inline SVG so they render crisply at any size without an
 * asset pipeline. All accept standard SVG props (className, aria-*).
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function GmailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path d="M6 38h6V22l-6-4.5V38Z" fill="#4285F4" />
      <path d="M36 38h6V17.5L36 22v16Z" fill="#34A853" />
      <path d="M12 22 24 31l12-9V12l-12 9-12-9v10Z" fill="#EA4335" />
      <path d="M6 13.5v4L12 22V12l-2.4-1.8C7.6 8.7 6 9.8 6 13.5Z" fill="#C5221F" />
      <path d="M42 13.5v4L36 22V12l2.4-1.8c2-1.5 3.6-.4 3.6 3.3Z" fill="#FBBC04" />
      <path d="M12 12v10l12 9 12-9V12H12Z" fill="none" />
    </svg>
  );
}

export function GoogleDriveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path d="m8.4 36.5 2.8 4.8c.6 1 1.4 1.8 2.4 2.4L19 32H3c0 1.1.3 2.2.9 3.2l4.5 1.3Z" fill="#0066DA" />
      <path d="M24 16 15 4.3c-1 .6-1.8 1.4-2.4 2.4L3.9 22c-.6 1-.9 2.1-.9 3.2h16L24 16Z" fill="#00AC47" />
      <path d="M34.4 43.7c1-.6 1.8-1.4 2.4-2.4l1.2-2 5.6-9.7c.6-1 .9-2.1.9-3.2H29l3.4 6.7 2 10.6Z" fill="#EA4335" />
      <path d="m24 16 9-11.7c-1-.6-2.1-.9-3.2-.9H18.2c-1.1 0-2.2.3-3.2.9L24 16Z" fill="#00832D" />
      <path d="M29 25.2H19l-6.4 11.3h22.8L29 25.2Z" fill="#2684FC" />
      <path d="M34.4 25.2H44.5L35.8 10.1c-.6-1-1.4-1.8-2.4-2.4L24 16l10.4 9.2Z" fill="#FFBA00" />
    </svg>
  );
}

function DocShape({ fill, children }: { fill: string; children?: React.ReactNode }) {
  return (
    <>
      <path d="M11 4h17l9 9v29a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill={fill} />
      <path d="M28 4v9h9l-9-9Z" fill="#000" fillOpacity={0.2} />
      {children}
    </>
  );
}

export function GoogleDocsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <DocShape fill="#4285F4">
        <path d="M15 23h18v2.5H15zM15 28.5h18V31H15zM15 34h12v2.5H15z" fill="#fff" />
      </DocShape>
    </svg>
  );
}

export function GoogleSheetsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <DocShape fill="#34A853">
        <path
          d="M15 22h18v15H15V22Zm2.5 2.5v3h5.5v-3h-5.5Zm8 0v3h5v-3h-5Zm-8 5.5v3h5.5v-3h-5.5Zm8 0v3h5v-3h-5Z"
          fill="#fff"
          fillRule="evenodd"
        />
      </DocShape>
    </svg>
  );
}

export function GoogleCalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <path d="M12 8h24a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" fill="#fff" />
      <path d="M8 12a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v6H8v-6Z" fill="#4285F4" />
      <path d="M8 18h7v7H8z" fill="#4285F4" />
      <path d="M33 18h7v7h-7z" fill="#1967D2" />
      <path d="M8 25h7v7H8z" fill="#188038" />
      <path d="M33 25h7v7h-7z" fill="#FBBC04" />
      <path d="M8 32h7v8h-7a4 4 0 0 1-4-4v-4h4Z" fill="#1967D2" />
      <path d="M33 32h7v4a4 4 0 0 1-4 4h-3v-8Z" fill="#EA4335" />
      <path d="M15 18h18v14H15z" fill="#fff" />
      <path
        d="M20.6 25.1c.5 0 1-.1 1.3-.4.4-.3.5-.7.5-1.2 0-.4-.1-.8-.4-1-.3-.3-.7-.4-1.2-.4s-.9.1-1.2.4c-.3.3-.5.6-.6 1h-1.7c.1-.9.5-1.6 1.1-2.1.7-.6 1.5-.8 2.4-.8 1 0 1.8.3 2.4.8.6.5.9 1.2.9 2.1 0 .5-.1.9-.4 1.3-.3.4-.6.7-1.1.9.6.2 1 .5 1.3.9.3.4.5.9.5 1.5 0 .9-.3 1.7-1 2.2-.7.6-1.5.9-2.6.9-1 0-1.8-.3-2.5-.8-.7-.6-1.1-1.3-1.2-2.2h1.7c.1.5.3.8.6 1.1.4.3.8.4 1.3.4.6 0 1-.1 1.4-.4.3-.3.5-.7.5-1.2s-.2-.9-.5-1.2c-.4-.3-.9-.4-1.5-.4h-.8v-1.4h.8Zm8.3 5.9h-1.7v-7.6l-2.3.8v-1.5l3.8-1.4h.2v9.7Z"
        fill="#1967D2"
      />
    </svg>
  );
}
