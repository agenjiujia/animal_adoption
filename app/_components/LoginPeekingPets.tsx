"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useAnimation } from "framer-motion";

type PupilOff = { x: number; y: number };

function clampPupil(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  eyeX: number,
  eyeY: number,
  maxR: number,
): PupilOff {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  const dx = p.x - eyeX;
  const dy = p.y - eyeY;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return { x: 0, y: 0 };
  const s = Math.min(maxR / d, 1);
  return { x: dx * s, y: dy * s };
}

function clampVec(dx: number, dy: number, maxR: number): PupilOff {
  const len = Math.hypot(dx, dy);
  if (len <= maxR || len < 1e-6) return { x: dx, y: dy };
  const s = maxR / len;
  return { x: dx * s, y: dy * s };
}

const ZEROS = {
  catL: { x: 0, y: 0 },
  catR: { x: 0, y: 0 },
  dogL: { x: 0, y: 0 },
  dogR: { x: 0, y: 0 },
};

const CAT_L = { x: 74, y: 104, r: 5.5 };
const CAT_R = { x: 126, y: 104, r: 5.5 };
const DOG_L = { x: 72, y: 106, r: 5.5 };
const DOG_R = { x: 128, y: 106, r: 5.5 };

/** 展示密码时猫盯左上（相对各自眼珠中心，y 越负越朝上） */
const CAT_PEEK_LOOK = { x: -5, y: -14 };
/** 展示密码时狗盯右上 */
const DOG_PEEK_LOOK = { x: 5, y: -14 };

export type LoginPeekingPetsProps = {
  /** 密码框是否为明文 */
  passwordVisible?: boolean;
  /** 登录接口失败时递增，用于触发惊吓动画 */
  authErrorNonce?: number;
};

export default function LoginPeekingPets({
  passwordVisible = false,
  authErrorNonce = 0,
}: LoginPeekingPetsProps) {
  const [mouse, setMouse] = useState({ x: -1, y: -1 });
  const [pupils, setPupils] = useState(ZEROS);
  const [flinch, setFlinch] = useState(false);
  const catRef = useRef<SVGSVGElement | null>(null);
  const dogRef = useRef<SVGSVGElement | null>(null);
  const reduceMotionRef = useRef(false);
  const shakeCtrl = useAnimation();
  const bodyCtrl = useAnimation();
  const prevVisibleRef = useRef(passwordVisible);
  const prevNonceRef = useRef(0);

  useLayoutEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const updatePupils = useCallback((clientX: number, clientY: number) => {
    if (reduceMotionRef.current) {
      setPupils(ZEROS);
      return;
    }
    const cat = catRef.current;
    const dog = dogRef.current;
    if (!cat || !dog) return;
    const squint = flinch;
    const catBonus = squint ? 1.35 : passwordVisible ? 1.32 : 1;
    const dogBonus = squint ? 1.35 : passwordVisible ? 1.32 : 1;
    const catL = clampPupil(
      cat,
      clientX,
      clientY,
      CAT_L.x,
      CAT_L.y,
      CAT_L.r * catBonus,
    );
    const catR = clampPupil(
      cat,
      clientX,
      clientY,
      CAT_R.x,
      CAT_R.y,
      CAT_R.r * catBonus,
    );
    const dogL = clampPupil(
      dog,
      clientX,
      clientY,
      DOG_L.x,
      DOG_L.y,
      DOG_L.r * dogBonus,
    );
    const dogR = clampPupil(
      dog,
      clientX,
      clientY,
      DOG_R.x,
      DOG_R.y,
      DOG_R.r * dogBonus,
    );
    const squintLX = squint ? 2.2 : 0;
    const squintRX = squint ? -2.2 : 0;
    const peek = passwordVisible && !squint;
    const cb = peek ? CAT_PEEK_LOOK : { x: 0, y: 0 };
    const db = peek ? DOG_PEEK_LOOK : { x: 0, y: 0 };
    const catLm = clampVec(
      catL.x + squintLX + cb.x,
      catL.y + cb.y,
      CAT_L.r * catBonus,
    );
    const catRm = clampVec(
      catR.x + squintRX + cb.x,
      catR.y + cb.y,
      CAT_R.r * catBonus,
    );
    const dogLm = clampVec(
      dogL.x + squintLX + db.x,
      dogL.y + db.y,
      DOG_L.r * dogBonus,
    );
    const dogRm = clampVec(
      dogR.x + squintRX + db.x,
      dogR.y + db.y,
      DOG_R.r * dogBonus,
    );
    setPupils({
      catL: catLm,
      catR: catRm,
      dogL: dogLm,
      dogR: dogRm,
    });
  }, [flinch, passwordVisible]);

  useLayoutEffect(() => {
    if (reduceMotionRef.current || mouse.x < 0) return;
    updatePupils(mouse.x, mouse.y);
  }, [mouse, updatePupils]);

  useLayoutEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (authErrorNonce <= 0 || authErrorNonce === prevNonceRef.current) return;
    prevNonceRef.current = authErrorNonce;
    if (reduceMotionRef.current) return;
    setFlinch(true);
    void shakeCtrl.start({
      x: [0, -11, 11, -8, 8, -4, 4, 0],
      transition: { duration: 0.48, ease: "easeInOut" },
    });
    const t = window.setTimeout(() => setFlinch(false), 520);
    return () => window.clearTimeout(t);
  }, [authErrorNonce, shakeCtrl]);

  useEffect(() => {
    if (reduceMotionRef.current) return;
    const wasHidden = !prevVisibleRef.current;
    prevVisibleRef.current = passwordVisible;
    if (passwordVisible && wasHidden) {
      void bodyCtrl.start({
        scale: [1, 1.1, 1.04],
        y: [0, -4, -2],
        transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] },
      });
    } else if (!passwordVisible && !wasHidden) {
      void bodyCtrl.start({
        scale: [1.04, 0.97, 1],
        y: [-2, 1, 0],
        transition: { duration: 0.28, ease: "easeOut" },
      });
    } else {
      void bodyCtrl.start({
        scale: passwordVisible ? 1.04 : 1,
        y: passwordVisible ? -2 : 0,
        transition: { type: "spring", stiffness: 380, damping: 24 },
      });
    }
  }, [passwordVisible, bodyCtrl]);

  const onCardPointer = (e: React.MouseEvent) => {
    updatePupils(e.clientX, e.clientY);
  };

  const catRy = flinch ? 11 : passwordVisible ? 25 : 22;
  const catRx = flinch ? 21 : passwordVisible ? 21 : 20;
  const dogRy = flinch ? 10 : passwordVisible ? 23 : 20;
  const dogRx = flinch ? 17 : passwordVisible ? 19 : 18;
  const dogMouthOpen = passwordVisible && !flinch;

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={shakeCtrl}
      style={{
        display: "block",
        width: "100%",
        willChange: "transform",
      }}
    >
      <motion.div
        initial={{ scale: 1, y: 0 }}
        animate={bodyCtrl}
        style={{
          display: "block",
          width: "100%",
          transformOrigin: "50% 100%",
        }}
      >
        <div
          className="login-peeking-pets"
          role="img"
          aria-label="装饰小猫小狗"
          onMouseMove={onCardPointer}
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 8,
            userSelect: "none",
            filter: "drop-shadow(0 12px 18px rgba(15, 23, 42, 0.12))",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "flex-end",
              transform: "translateX(-4px) translateY(3px) rotate(-7deg)",
              transformOrigin: "85% 100%",
            }}
          >
          <svg
            ref={catRef}
            width={96}
            height={96}
            viewBox="0 0 200 200"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="loginCatFur" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde4c8" />
                <stop offset="100%" stopColor="#f0c9a0" />
              </linearGradient>
            </defs>
            <path
              d="M 52 52 L 58 18 L 82 40 Z"
              fill="url(#loginCatFur)"
              stroke="#e8b88a"
              strokeWidth="2"
              strokeLinejoin="round"
              transform={flinch ? "rotate(-6 52 52)" : undefined}
            />
            <path
              d="M 148 52 L 142 18 L 118 40 Z"
              fill="url(#loginCatFur)"
              stroke="#e8b88a"
              strokeWidth="2"
              strokeLinejoin="round"
              transform={flinch ? "rotate(6 148 52)" : undefined}
            />
            <ellipse
              cx="100"
              cy="118"
              rx="58"
              ry="50"
              fill="url(#loginCatFur)"
              stroke="#e8b88a"
              strokeWidth="2"
            />
            <ellipse
              cx="74"
              cy="104"
              rx={catRx}
              ry={catRy}
              fill="#fff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <ellipse
              cx="126"
              cy="104"
              rx={catRx}
              ry={catRy}
              fill="#fff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <circle cx={CAT_L.x + pupils.catL.x} cy={CAT_L.y + pupils.catL.y} r="9" fill="#334155" />
            <circle cx={CAT_L.x + pupils.catL.x - 2} cy={CAT_L.y + pupils.catL.y - 2} r="3" fill="#fff" opacity="0.4" />
            <circle cx={CAT_R.x + pupils.catR.x} cy={CAT_R.y + pupils.catR.y} r="9" fill="#334155" />
            <circle cx={CAT_R.x + pupils.catR.x - 2} cy={CAT_R.y + pupils.catR.y - 2} r="3" fill="#fff" opacity="0.4" />
            <path
              d="M 94 138 Q 100 148 106 138"
              fill="none"
              stroke="#c4a080"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon points="100,128 92,140 108,140" fill="#f9a8d4" opacity="0.9" />
          </svg>
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "flex-end",
              transform: "translateX(4px) translateY(0px) rotate(7deg)",
              transformOrigin: "15% 100%",
            }}
          >
          <svg
            ref={dogRef}
            width={96}
            height={96}
            viewBox="0 0 200 200"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="loginDogFur" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#edd2b0" />
                <stop offset="100%" stopColor="#d4a574" />
              </linearGradient>
            </defs>
            <ellipse cx="44" cy="72" rx="20" ry="32" fill="#b8956a" transform="rotate(-22 44 72)" />
            <ellipse cx="156" cy="72" rx="20" ry="32" fill="#b8956a" transform="rotate(22 156 72)" />
            <ellipse cx="100" cy="118" rx="60" ry="52" fill="url(#loginDogFur)" stroke="#b8956a" strokeWidth="2" />
            <ellipse cx="124" cy="124" rx="34" ry="28" fill="#e8c49a" stroke="#b8956a" strokeWidth="1.5" />
            <ellipse cx="72" cy="106" rx={dogRx} ry={dogRy} fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
            <ellipse cx="128" cy="106" rx={dogRx} ry={dogRy} fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx={DOG_L.x + pupils.dogL.x} cy={DOG_L.y + pupils.dogL.y} r="8.5" fill="#334155" />
            <circle cx={DOG_L.x + pupils.dogL.x - 2} cy={DOG_L.y + pupils.dogL.y - 2} r="2.5" fill="#fff" opacity="0.4" />
            <circle cx={DOG_R.x + pupils.dogR.x} cy={DOG_R.y + pupils.dogR.y} r="8.5" fill="#334155" />
            <circle cx={DOG_R.x + pupils.dogR.x - 2} cy={DOG_R.y + pupils.dogR.y - 2} r="2.5" fill="#fff" opacity="0.4" />
            {dogMouthOpen ? (
              <ellipse cx="138" cy="134" rx="10" ry="8" fill="#1e293b" opacity="0.22" />
            ) : (
              <ellipse cx="138" cy="132" rx="9" ry="7" fill="#1e293b" opacity="0.15" />
            )}
          </svg>
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
