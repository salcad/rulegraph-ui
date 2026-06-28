import { useEffect, useRef } from "react";
import { Modal } from "./Modal";

interface WalkthroughModalProps {
  onClose: (dontShowAgain: boolean) => void;
}

/** The things worth pointing out, each a short title and a plain-English paragraph. */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: "The report",
    body:
      "Thirteen numbers, one per rule. Each shows the value, the limit, and how close you are to it. " +
      "Green means fine, red means broken. Easy to read at a glance.",
  },
  {
    title: "Every number is traceable",
    body:
      "Click any number and you see the exact trail the engine followed to get it, ending on the " +
      "single line in the rulebook that sets that rule. Not the whole page, the one sentence. So " +
      "“where did this come from?” always has an answer on screen.",
  },
  {
    title: "The AI never touches the math",
    body:
      "An AI writes a short plain-English summary of the results, but it is never allowed to make up " +
      "a number. The app scans the AI's text and checks every number against the real results. If " +
      "the AI ever slipped one in, it gets caught. The boundary is proven, not just promised.",
  },
  {
    title: "It checks itself",
    body:
      "Every figure is matched against the fund's official answer sheet. All thirteen matched " +
      "perfectly. And every step is recorded like a flight recorder, so anyone can retrace exactly " +
      "what happened.",
  },
  {
    title: "One build, many funds",
    body:
      "Different funds count things slightly differently. Switching to a second fund took one " +
      "settings change and no code. Its numbers shift, some rules flip to broken, and everything " +
      "else stays the same.",
  },
];

/**
 * A quick walkthrough shown on first load so a viewer with no context understands what RuleGraph is
 * and why it is built the way it is. Dismissal is remembered via the "Don't show again" checkbox; the
 * Header keeps a button to reopen it on demand.
 */
export function WalkthroughModal({ onClose }: WalkthroughModalProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // A slow, game-intro-style auto-scroll of the narration. It starts on its own after a short beat
  // and stops the moment the viewer takes over (scrolls, taps, or presses a key). Skipped entirely
  // for viewers who prefer reduced motion, who can still scroll by hand.
  useEffect(() => {
    const scroller = rootRef.current?.closest(".modal-body") as HTMLElement | null;
    if (!scroller) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let acc = 0;
    let stopped = false;
    const SPEED = 0.35; // pixels per frame: a calm crawl, not a sprint

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    const handoffEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    handoffEvents.forEach((e) => scroller.addEventListener(e, stop, { passive: true }));

    const step = () => {
      if (stopped) return;
      // scrollTop snaps to whole pixels, so accumulate the fractional remainder to keep slow speeds moving.
      acc += SPEED;
      const whole = Math.floor(acc);
      if (whole) {
        scroller.scrollTop += whole;
        acc -= whole;
      }
      // Settle at the bottom rather than looping.
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) return;
      raf = requestAnimationFrame(step);
    };
    const start = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 600);

    return () => {
      stop();
      clearTimeout(start);
      handoffEvents.forEach((e) => scroller.removeEventListener(e, stop));
    };
  }, []);

  return (
    <Modal title="What RuleGraph does" onClose={() => onClose(false)} className="modal-narrow">
      <div className="walkthrough" ref={rootRef}>
        <div className="walkthrough-intro">
          <p>
            Imagine you run an investment fund. You follow a long list of rules, things like
            &ldquo;don&apos;t put too much money in any one risky bet.&rdquo; Every reporting period
            you have to check your investments against that list and prove you followed every one.
          </p>
          <p>
            Today most people do this by hand in spreadsheets. It is slow, easy to get subtly wrong,
            and hard to defend. When an auditor points at a number and asks where it came from, the
            honest answer is usually &ldquo;somewhere in this giant file.&rdquo;
          </p>
          <p>
            RuleGraph fixes that. You give it two things, the rulebook and a snapshot of what the
            fund owns. It does the math for every rule, tells you whether you passed or broke it, and
            shows exactly where each number came from.
          </p>
        </div>

        <div className="walkthrough-sections">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <strong>{s.title}</strong>
              <p>{s.body}</p>
            </section>
          ))}
        </div>

        <p className="walkthrough-closing">
          The goal was never just correct numbers. It was numbers a regulator or auditor can actually
          defend.
        </p>

        <div className="walkthrough-actions">
          <label className="walkthrough-dontshow">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) onClose(true);
              }}
            />
            Don&apos;t show this again
          </label>
          <button className="run-extractor" onClick={() => onClose(false)}>
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
