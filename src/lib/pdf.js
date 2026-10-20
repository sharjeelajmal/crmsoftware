"use client";

import { createRoot } from "react-dom/client";

/**
 * Client-side PDF helpers. html2canvas and jsPDF are imported lazily so they
 * stay out of the main bundle until a PDF is actually requested.
 */

const waitForAssets = async (container) => {
  await document.fonts?.ready;
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        img.complete ||
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
    )
  );
  // One frame so layout/paint settles after images arrive.
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
};

/** Renders a React element off-screen, runs `work(container)`, then cleans up. */
export async function renderOffscreen(element, work) {
  const container = document.createElement("div");
  Object.assign(container.style, { position: "fixed", left: "-10000px", top: "0" });
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await new Promise((resolve) => {
      root.render(element);
      requestAnimationFrame(resolve);
    });
    await waitForAssets(container);
    return await work(container);
  } finally {
    root.unmount();
    container.remove();
  }
}

/** Rasterises a DOM element onto an A4 portrait PDF and triggers the download. */
export async function elementToPdf(element, filename, { scale = 3 } = {}) {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const canvas = await html2canvas(element, { scale, useCORS: true });
  const pdf = new JsPDF("p", "mm", "a4");
  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
  pdf.save(filename);
}
