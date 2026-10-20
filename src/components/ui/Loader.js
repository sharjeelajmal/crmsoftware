"use client";

import Image from "next/image";
import { BRAND } from "@/constants/brand";

/**
 * Brand loader: logo inside a spinning gradient ring (styles in globals.css under "LOADER").
 * - default: full-screen frosted overlay (page is loading)
 * - `inline`: compact block for inside cards/tables
 */
export function Loader({ text = "Loading", inline = false }) {
  const size = inline ? 44 : 84;
  const content = (
    <>
      <div className="loader-ring" aria-hidden="true">
        <Image src={BRAND.logo} alt="" width={size} height={size} className="loader-logo" priority />
      </div>
      <p className="loader-text">
        {text}
        <span className="loader-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </p>
    </>
  );

  if (inline) {
    return (
      <div className="loader-inline" role="status" aria-live="polite" aria-label={text}>
        {content}
      </div>
    );
  }

  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-label={text}>
      <div className="loader-container">{content}</div>
    </div>
  );
}

export default Loader;
