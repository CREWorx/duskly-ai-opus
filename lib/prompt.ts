interface PromptParams {
  address: string;
  date: string;
  bearing: string;
}

function escapeString(str: string): string {
  return (str || '').replace(/[\r\n]/g, ' ').slice(0, 500);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const bearingToDirection: Record<string, string> = {
  'N': 'north',
  'NE': 'northeast', 
  'E': 'east',
  'SE': 'southeast',
  'S': 'south',
  'SW': 'southwest',
  'W': 'west',
  'NW': 'northwest'
};

export function generatePrompt(params: PromptParams): string {
  const direction = bearingToDirection[params.bearing] || params.bearing.toLowerCase();
  
  return `
> **Task**: Convert the **attached daytime exterior photo** into a **golden-hour (pre-sunset)** image with physically correct light. **Do not change the scene**—only time-of-day lighting/sky and exposure/color.
>
> **Site & Orientation (for realism)**
>
> * **Address**: ${escapeString(params.address)}
> * **Date**: ${formatDate(params.date)}
> * **Camera bearing (true-north)**: "camera facing ${direction}"
> * Infer **sunset azimuth** for this address/date and set the sun **~4–8° above horizon** (15–25 min before set). Place the **warmest sky** and **key light** toward that azimuth; keep the opposite sky cooler/deeper.
>
> **Hard Invariants (must not change at all)**
>
> * Architecture, rooflines, façades, windows/mullions, signage text, parking layout/striping, curbs, poles, fencing, paving cracks, pool shape, vegetation (species, size, placement), vehicles (count/model/placement), camera position, perspective, aspect ratio, resolution.
> * **No additions/removals/moves** of any objects. **No lens flares, fog, stars, or rain.**
>
> **Golden-Hour Relighting (physically plausible)**
>
> * Compute **direct sun** from the sunset azimuth/low altitude; create **long, soft shadows** and **warm edge/rim light** on sun-facing roof edges, siding, trees, and vehicles. **No double shadows.**
> * **Sky**: subtle gradient—warm apricot/orange near the sun fading to neutral/blue away; light, thin clouds only if already present.
> * **Reflections**: update **window/pool reflections** to the new sky/sun angle; keep mullion contrast and glass tint realistic.
> * **Artificial lighting**: Interior lights may be **on, low-to-moderate** (2700–3000K). Exterior fixtures **only if they exist** in the photo; no new fixtures. Keep intensity believable—no halos/bloom.
>
> **Finishing-Grade (Golden Hour • CRE-Ready)**
>
> * **Global tonality**: target mean luminance **0.52–0.56** (bright, marketable). **Black point 2–3% (RGB≈6–8)**; **white point 97–98% (RGB≈247–250)**. Gentle **S-curve** with midtone pivot ~**45%**; protect highlight detail on siding, concrete, and clouds.
> * **Shadow lift**: raise the **lowest 15–20%** luminance by **+0.20 EV** so asphalt texture, shrubs, and roof shingles read cleanly; keep parking-lot cracks and striping visible.
> * **Color grade**: **Outdoor WB warm (≈4800–5200K)**; interiors **≈2800–3000K** for subtle warm-inside/warmer-outside harmony without orange clipping. **Vibrance +18%, Saturation +6%** (natural foliage—no neon greens).
> * **Micro-contrast/clarity**: **+10–12% at 0.8–1.2px radius**; suppress halos on rooflines/horizon.
> * **Texture preservation**: retain shingle grain, stucco, asphalt tooth; minimal denoise only for chroma noise.
> * **Sharpening**: low-radius detail sharpening (**radius 0.6–0.8px, amount ~0.8, threshold 2**).
> * **Color integrity**: neutral grays (pavement, siding) stay neutral; no magenta cast. Skin-tone range protection even if people appear in frame.
>
> **Output**
>
> * **One edited image**, same crop, aspect, and resolution as the original.
> * Color space **sRGB**, **JPEG Q90–95**.
>
> **Negative Constraints (hard)**
>
> * Do **not** invent or remove objects, vehicles, trees, fixtures, or signage.
> * Do **not** change framing, focal length look, or perspective.
> * No excessive glow/bloom, no HDR halos, no cartoon saturation, no invented reflections.`;
}