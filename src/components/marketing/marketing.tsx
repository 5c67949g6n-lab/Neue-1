import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MarketingIcon } from "@/i18n/de/marketing";

/** Bausteine für die öffentlichen Seiten (Startseite, /vermieten). Icons als inline SVG. */

type IconName = MarketingIcon | "check" | "x" | "pin" | "arrow";

const iconPaths: Record<IconName, ReactNode> = {
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3l1.8 4.9L17.7 9.7l-4.9 1.8L11 16.4l-1.8-4.9L4.3 9.7l4.9-1.8z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
      <path d="M15 8h4v4" />
    </>
  ),
  home: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
  ),
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5", className)}
    >
      {iconPaths[name]}
    </svg>
  );
}

/** Icon in einer runden, eingefärbten Fläche. */
export function IconBubble({ name, className }: { name: IconName; className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl",
        className,
      )}
    >
      <Icon name={name} className="size-6" />
    </span>
  );
}

export function SectionHeading({
  id,
  title,
  description,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto mb-8 max-w-2xl text-center sm:mb-12", className)}>
      <h2 id={id} className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-3 text-base text-pretty sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

/** Nummerierte Schritte mit Verbindungslinie. */
export function NumberedSteps({
  steps,
  headingLevel: Heading = "h3",
  className,
}: {
  steps: ReadonlyArray<{ title: string; text: string }>;
  headingLevel?: "h3" | "h4";
  className?: string;
}) {
  return (
    <ol className={cn("space-y-6", className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4">
          {index < steps.length - 1 ? (
            <span aria-hidden className="bg-border absolute top-11 bottom-[-1.25rem] left-5 w-px" />
          ) : null}
          <span
            aria-hidden
            className="bg-primary text-primary-foreground relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
          >
            {index + 1}
          </span>
          <div className="pt-1.5">
            <Heading className="font-semibold">
              <span className="sr-only">Schritt {index + 1}: </span>
              {step.title}
            </Heading>
            <p className="text-muted-foreground mt-1 text-sm leading-6">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
