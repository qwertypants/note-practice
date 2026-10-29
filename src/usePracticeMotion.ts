import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Round } from "./contracts";

gsap.registerPlugin(useGSAP);

// Short, event-driven accents only. Practice never waits for a timeline.
export function usePracticeMotion(showGuide: boolean, round: Round | null) {
  const scope = useRef<HTMLDivElement>(null);
  const screen = showGuide
    ? "guide"
    : round?.status === "complete"
      ? "summary"
      : "game";

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".topbar, .lesson-list", {
          y: 6,
          opacity: 0,
          duration: 0.3,
          stagger: 0.04,
          overwrite: "auto",
          clearProps: "transform,opacity",
        });
      });
      return () => media.revert();
    },
    { scope },
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".practice-panel > section", {
          y: 8,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform",
        });
        if (screen !== "game") {
          gsap.from(".practice-panel .sun", {
            rotation: "-=18",
            scale: 0.85,
            duration: 0.55,
            ease: "back.out(1.8)",
            overwrite: "auto",
            clearProps: "transform",
          });
        }
        if (screen === "summary") {
          gsap.from(".summary-stats > div", {
            y: 8,
            scale: 0.96,
            duration: 0.4,
            stagger: 0.08,
            ease: "back.out(1.5)",
            overwrite: "auto",
            clearProps: "transform",
          });
        }
      });
      return () => media.revert();
    },
    { scope, dependencies: [screen, round?.lessonId], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (showGuide || !round || round.status === "complete") return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (round.status === "correct") {
          gsap.fromTo(
            ".is-target .note-dot",
            { scale: 1 },
            {
              scale: 1.16,
              duration: 0.18,
              repeat: 1,
              yoyo: true,
              ease: "power2.out",
              overwrite: "auto",
              clearProps: "transform",
            },
          );
          gsap.from(".feedback-correct, .streak", {
            y: 4,
            duration: 0.3,
            ease: "back.out(2)",
            overwrite: "auto",
            clearProps: "transform",
          });
        } else {
          gsap.from(".staff-card", {
            y: 5,
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
            clearProps: "transform",
          });
        }
      });
      return () => media.revert();
    },
    {
      scope,
      dependencies: [showGuide, round?.index, round?.status, round?.lessonId],
      revertOnUpdate: true,
    },
  );

  return scope;
}
