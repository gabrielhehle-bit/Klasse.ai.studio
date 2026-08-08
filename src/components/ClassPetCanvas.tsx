import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

export interface ClassPetCanvasRef {
  feed: (customEmoji?: string) => void;
  bounce: () => void;
  celebrate: () => void;
  setMood?: (val: number) => void;
  spawnToy: (type: "ball" | "bubble" | "balloon" | "yarn" | "feather") => void;
  clearToys: () => void;
}

interface ClassPetCanvasProps {
  animalType: string;
  accessories?: string[];
  behaviorMode?: "idle" | "wander" | "sleep" | "learn" | "auto" | "quiet";
  energy?: number;
  width?: number | string;
  height?: number | string;
  onFeed?: () => void;
  isMoving?: boolean;
  isDashboard?: boolean;
  isCalm?: boolean;
  isWakingUp?: boolean;
  homeStyle?:
    | "basket"
    | "nest"
    | "teal"
    | "tent"
    | "capsule"
    | "branch"
    | "cloud";
  boardWidgets?: any[];
  isPauseTimerRunning?: boolean;
  scale?: number;
  isClimbingSidebar?: boolean;
  isSlidingDown?: boolean;
  mood?: number;
  isBirthday?: boolean;
  birthdayNames?: string;
}

// --- ANIMATION CONSTANTS BLOCK ---
const ANIM_BLINK_MIN = 180;
const ANIM_BLINK_MAX = 360;
const ANIM_BLINK_DURATION = 4;
const ANIM_IDLE_MIN_INTERVAL = 300;
const ANIM_IDLE_MAX_INTERVAL = 900;
const ANIM_BREATHE_SPEED_WANDER = 0.03;
const ANIM_BREATHE_SPEED_SLEEP = 0.015;
const ANIM_BREATHE_DEPTH_WANDER = 0.02;
const ANIM_BREATHE_DEPTH_SLEEP = 0.035;
const ANIM_SLEEP_TRANSITION_FRAMES = 45;

export const ClassPetCanvas = forwardRef<
  ClassPetCanvasRef,
  ClassPetCanvasProps
>(
  (
    {
      animalType,
      accessories = [],
      behaviorMode = "wander",
      energy = 50,
      width = "100%",
      height = "100%",
      onFeed,
      isMoving,
      isDashboard = false,
      isCalm = false,
      isWakingUp,
      homeStyle = "basket",
      boardWidgets = [],
      isPauseTimerRunning = false,
      scale = 1.0,
      isClimbingSidebar = false,
      isSlidingDown = false,
      mood = 75,
      isBirthday = false,
      birthdayNames = "",
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const scaleRef = useRef(scale);
    useEffect(() => {
      scaleRef.current = scale;
    }, [scale]);

    const isMovingRef = useRef(isMoving);
    useEffect(() => {
      isMovingRef.current = isMoving;
    }, [isMoving]);

    const isWakingUpRef = useRef(isWakingUp);
    useEffect(() => {
      if (!isWakingUpRef.current && isWakingUp) {
        // Trigger waking up stretch and hop!
        stateRef.current.pet.stretchTimer = 90;
      }
      isWakingUpRef.current = isWakingUp;
    }, [isWakingUp]);

    const homeStyleRef = useRef(homeStyle);
    useEffect(() => {
      homeStyleRef.current = homeStyle;
    }, [homeStyle]);

    const boardWidgetsRef = useRef(boardWidgets);
    useEffect(() => {
      boardWidgetsRef.current = boardWidgets;
    }, [boardWidgets]);

    const isPauseTimerRunningRef = useRef(isPauseTimerRunning);
    useEffect(() => {
      isPauseTimerRunningRef.current = isPauseTimerRunning;
    }, [isPauseTimerRunning]);

    const isClimbingSidebarRef = useRef(isClimbingSidebar);
    useEffect(() => {
      isClimbingSidebarRef.current = isClimbingSidebar;
    }, [isClimbingSidebar]);

    const isSlidingDownRef = useRef(isSlidingDown);
    useEffect(() => {
      isSlidingDownRef.current = isSlidingDown;
    }, [isSlidingDown]);

    const moodRef = useRef(mood);
    useEffect(() => {
      moodRef.current = mood;
      stateRef.current.mood = mood;
    }, [mood]);

    const stateRef = useRef({
      pet: {
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        targetX: 100,
        targetY: 100,
        targetWall: "bottom" as "bottom" | "left" | "right",
        currentWall: "bottom" as "bottom" | "left" | "right",
        rotation: 0,
        climbProgress: 0,
        bounceTimer: 0,
        sleepZTimer: 0,
        wanderTimer: 0,
        learnTimer: 0,
        prevAirborne: false,
        landBounceValue: 0,
        eyeScaleY: 1.0,
        isSalto: false,
        saltoAngle: 0,
        isHanging: false,
        isParachuteOpen: false,
        isSliding: false,
        isScared: false,
        isDizzy: false,
        dizzyTimer: 0,
        fallHeight: 0,
        currentPlatform: null as any,
        highFiveTimer: 0,
        legSwingAngle: 0,
        whistleTimer: 0,
        isSkidding: false,
        wagTimer: 0,
        headTiltTimer: 0,
        stretchTimer: 0,
      },
      food: [] as {
        x: number;
        y: number;
        vy: number;
        id: number;
        emoji: string;
        alpha?: number;
      }[],
      toys: [] as {
        id: number;
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
        type: "ball" | "yarn" | "feather" | "bubble" | "balloon";
        rotation: number;
        rotSpeed: number;
      }[],
      particles: [] as {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        color: string;
        emoji?: string;
        type?:
          | "wind"
          | "crumb"
          | "star"
          | "heart"
          | "note"
          | "zzz"
          | "default"
          | "snow"
          | "leaf"
          | "blossom"
          | "confetti";
        angle?: number;
        sizeScale?: number;
      }[],
      lastTime: 0,
      squashX: 1.0,
      squashY: 1.0,
      blinkTimer:
        Math.floor(Math.random() * (ANIM_BLINK_MAX - ANIM_BLINK_MIN)) +
        ANIM_BLINK_MIN,
      blinkPhase: 0,
      hasDoubleBlinked: false,
      breathePhase: 0,
      idleAction: null as {
        typ:
          | "putzen"
          | "gaehnen"
          | "strecken"
          | "umschauen"
          | "wedeln"
          | "kopfneigen";
        frame: number;
        dauer: number;
      } | null,
      idleTimer:
        Math.floor(
          Math.random() * (ANIM_IDLE_MAX_INTERVAL - ANIM_IDLE_MIN_INTERVAL),
        ) + ANIM_IDLE_MIN_INTERVAL,
      prevBehaviorMode: behaviorMode,
      sleepTransitionValue: behaviorMode === "sleep" ? 0.0 : 1.0,
      sleepTransitionFrames: 0,
      sleepTransitionDir: null as "toSleep" | "fromSleep" | null,
      jumpQueue: null as {
        vy: number;
        bounceTimer: number;
        isSalto: boolean;
        framesLeft: number;
      } | null,
      landTimer: 0,
      mood: mood !== undefined ? mood : 75,
      mouse: {
        localX: 0,
        localY: 0,
        deltaX: 0,
        deltaY: 0,
        lastX: 0,
        lastY: 0,
        isOver: false,
        stillTime: 0,
        startleCooldown: 0,
        scaredTimer: 0,
        leaveTime: 0,
      },
      renderFlipX: 1,
      desiredFlipX: 1,
      dirChangeTimer: 0,
      gangPhase: 0,
      earLag: 0,
      tailLag: 0,
    });

    const queueJump = (
      vy: number,
      bounceTimerVal: number,
      isSalto: boolean = false,
    ) => {
      // Only queue if we aren't already jumping or preparing
      if (!stateRef.current.jumpQueue) {
        stateRef.current.jumpQueue = {
          vy,
          bounceTimer: bounceTimerVal,
          isSalto,
          framesLeft: 6,
        };
      }
    };

    useImperativeHandle(ref, () => ({
      clearToys: () => {
        stateRef.current.toys = [];
      },
      spawnToy: (type: "ball" | "bubble" | "balloon" | "yarn" | "feather") => {
        const state = stateRef.current;
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // Spawn from top
        state.toys.push({
          id: Math.random(),
          x: rect.width * 0.2 + Math.random() * (rect.width * 0.6),
          y: -20,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2,
          radius: type === "balloon" ? 20 : type === "bubble" ? 14 : 12,
          type,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      },
      feed: (customEmoji?: string) => {
        const state = stateRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const padding = 40;
        const x = padding + Math.random() * (rect.width - padding * 2);
        state.food.push({
          id: Math.random(),
          x,
          y: -20,
          vy: 2 + Math.random(),
          emoji:
            customEmoji ||
            ["⭐", "✨", "🍎", "🍪"][Math.floor(Math.random() * 4)],
        });

        if (onFeed) onFeed();
      },
      bounce: () => {
        queueJump(-12, 30);
      },
      celebrate: () => {
        const state = stateRef.current;
        queueJump(-16, 40, true);

        state.pet.wagTimer = 180; // Wag tail for 3 seconds
        state.pet.headTiltTimer = 90; // Head tilt for 1.5 seconds

        // Prevent canvas particle overflow by keeping max active particles capped at 50 to protect RAM/CPU
        if (state.particles && state.particles.length > 50) {
          state.particles = state.particles.slice(-30);
        }
      },
      setMood: (val: number) => {
        stateRef.current.mood = val;
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Global keyboard listener to track typing gaze direction
      let lastTypeTime = 0;
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (
          e.key === "Shift" ||
          e.key === "Control" ||
          e.key === "Alt" ||
          e.key === "Meta"
        )
          return;
        lastTypeTime = Date.now();
      };
      window.addEventListener("keydown", handleGlobalKeyDown);

      // Global mouse move listener to track gaze direction
      let mouseX = 0;
      let mouseY = 0;
      let lastMouseMoveTime = 0;
      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        stateRef.current.mouse.deltaX = deltaX;
        stateRef.current.mouse.deltaY = deltaY;
        stateRef.current.mouse.isOver = true;

        mouseX = e.clientX;
        mouseY = e.clientY;
        lastMouseMoveTime = now;
      };
      window.addEventListener("mousemove", handleMouseMove);

      const handleCanvasMouseEnter = () => {
        stateRef.current.mouse.isOver = true;
      };
      const handleCanvasMouseLeave = () => {
        stateRef.current.mouse.isOver = false;
        (stateRef.current.mouse as any).leaveTime = Date.now();
      };
      canvas.addEventListener("mouseenter", handleCanvasMouseEnter);
      canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

      const dpr = window.devicePixelRatio || 1;
      let rect = canvas.getBoundingClientRect();

      const setSize = () => {
        if (!canvas) return;
        rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const newW = Math.round(w * dpr);
        const newH = Math.round(h * dpr);
        if (canvas.width !== newW || canvas.height !== newH) {
          canvas.width = newW;
          canvas.height = newH;
        }

        const state = stateRef.current;
        if (w > 50 && h > 50) {
          if (state.pet.x === 100 && state.pet.y === 100) {
            state.pet.x = w / 2;
            state.pet.y = h - 45;
            state.pet.targetX = w / 2;
            state.pet.targetY = h - 45;
          } else if (state.pet.x === 0 && state.pet.y === 0) {
            // Recover if it collapsed to 0,0 previously
            state.pet.x = w / 2;
            state.pet.y = h - 45;
            state.pet.targetX = w / 2;
            state.pet.targetY = h - 45;
          }
        }
      };
      setSize();

      // Use ResizeObserver to ensure live responsive updates to container dimensions
      const resizeObserver = new ResizeObserver(() => {
        setSize();
      });
      resizeObserver.observe(canvas);

      // INTERACTIVE FLUID PETTING WORKFLOW
      let isMouseDown = false;
      let isPettingActive = false;
      let isDraggingPet = false;
      let dragDistanceX = 0;
      let dragDistanceY = 0;
      let lastDragX = 0;
      let lastDragY = 0;
      let petHappyCoop = 0;

      const getCanvasMousePos = (e: MouseEvent | TouchEvent) => {
        const crect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - crect.left,
          y: clientY - crect.top,
        };
      };

      const handleStart = (e: MouseEvent | TouchEvent) => {
        isMouseDown = true;
        const pos = getCanvasMousePos(e);
        lastDragX = pos.x;
        lastDragY = pos.y;
        dragDistanceX = 0;
        dragDistanceY = 0;

        const state = stateRef.current;
        const p = state.pet;
        const dx = pos.x - p.x;
        const dy = pos.y - (p.y - 20);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60 && behaviorMode !== "sleep") {
          isDraggingPet = true;
          isPettingActive = false;
          p.isHanging = false;
          p.isParachuteOpen = false;
          p.currentPlatform = null;
          p.currentWall = "bottom";
          p.vx = 0;
          p.vy = 0;
        } else if (dist < 60) {
          isPettingActive = true;
        }
      };

      const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isMouseDown) return;
        const pos = getCanvasMousePos(e);
        const dx = pos.x - lastDragX;
        const dy = pos.y - lastDragY;
        dragDistanceX += Math.abs(dx);
        dragDistanceY += Math.abs(dy);

        lastDragX = pos.x;
        lastDragY = pos.y;

        const state = stateRef.current;
        const p = state.pet;

        if (isDraggingPet) {
          p.x = pos.x;
          p.y = pos.y + 15;
          p.vx = dx * 0.8;
          p.vy = dy * 0.8;
          p.landBounceValue = 0.55; // squish while dragging
          p.eyeScaleY = 0.0; // happy eyes while held

          if (Math.random() < 0.12) {
            state.particles.push({
              x: p.x + (Math.random() - 0.5) * 30,
              y: p.y - 25,
              vx: (Math.random() - 0.5) * 2,
              vy: -1.0,
              life: 0.8,
              color: "#fb7185",
              emoji: "✨",
              type: "default",
              sizeScale: 0.6,
            });
          }
        } else if (
          isPettingActive &&
          (Math.abs(dx) > 1.2 || Math.abs(dy) > 1.2)
        ) {
          p.eyeScaleY = 0.0; // close eyes happily
          petHappyCoop = 25; // tick timer

          if (Math.random() < 0.25) {
            const petYCorrected = p.y - 25;
            state.particles.push({
              x: p.x + (Math.random() - 0.5) * 35,
              y: petYCorrected + (Math.random() - 0.5) * 35,
              vx: (Math.random() - 0.5) * 4,
              vy: -2.0 - Math.random() * 2.5,
              life: 1.0,
              color: ["#ec4899", "#f43f5e", "#fb7185", "#fbbf24"][
                Math.floor(Math.random() * 4)
              ],
              emoji: Math.random() < 0.35 ? "💖" : "✨",
              type: "default",
              sizeScale: 0.7 + Math.random() * 0.5,
            });
          }

          if (p.y >= rect.height - 47 && Math.random() < 0.06) {
            queueJump(-3.5 - Math.random() * 2.0, 0);
          }
        }
      };

      const handleEnd = (e: MouseEvent | TouchEvent) => {
        const state = stateRef.current;
        const p = state.pet;

        if (isDraggingPet) {
          isDraggingPet = false;

          // Throw velocity trigger!
          const throwX = Math.max(-18, Math.min(18, p.vx * 1.5));
          const throwY = Math.max(-18, Math.min(18, p.vy * 1.5));
          p.vx = throwX;
          p.vy = throwY;

          if (Math.abs(throwX) > 4.5 || Math.abs(throwY) > 4.5) {
            // Thrown with high impulse!
            p.landBounceValue = 0.8;
            for (let i = 0; i < 8; i++) {
              state.particles.push({
                x: p.x,
                y: p.y - 25,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 0.9,
                color: "#fbbf24",
                emoji: "✨",
                type: "default",
                sizeScale: 0.8 + Math.random() * 0.4,
              });
            }
          }
        } else if (
          isMouseDown &&
          isPettingActive &&
          dragDistanceX + dragDistanceY > 8
        ) {
          queueJump(-7.5, 30);

          for (let i = 0; i < 8; i++) {
            state.particles.push({
              x: p.x,
              y: p.y - 25,
              vx: (Math.random() - 0.5) * 5,
              vy: -3 - Math.random() * 5,
              life: 1.0,
              color: "#fbbf24",
              emoji: ["✨", "💖", "⭐"][Math.floor(Math.random() * 3)],
              type: "default",
              sizeScale: 0.8 + Math.random() * 0.4,
            });
          }

          if (onFeed) {
            onFeed();
          }
        } else if (isMouseDown && dragDistanceX + dragDistanceY < 6) {
          if (ref && "current" in ref && ref.current) {
            ref.current.feed();
          }
        }

        isMouseDown = false;
        isPettingActive = false;
      };

      canvas.addEventListener("mousedown", handleStart, { passive: true });
      canvas.addEventListener("mousemove", handleMove, { passive: true });
      canvas.addEventListener("mouseup", handleEnd, { passive: true });
      canvas.addEventListener("touchstart", handleStart, { passive: true });
      canvas.addEventListener("touchmove", handleMove, { passive: true });
      canvas.addEventListener("touchend", handleEnd, { passive: true });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let animationFrameId: number;
      let time = 0;

      let pupilOffsetX = 0;
      let pupilOffsetY = 0;

      // Smooth eye gaze tracking metrics
      let targetPupilOffsetX = 0;
      let targetPupilOffsetY = 0;
      let lastWidgetCount = 0;
      let lastActivatedWidgetPos: { x: number; y: number } | null = null;
      let widgetGazeDuration = 0;

      // --- PROCEDURAL DRAWING HELPERS ---

      const drawFeet = (
        ctx: CanvasRenderingContext2D,
        size: number,
        animalType: string,
        isMoving: boolean,
      ) => {
        if (behaviorMode === "sleep") return; // tucked in/hidden during sleep

        ctx.save();

        let legColor = "#fbbf24"; // body match
        let feetColor = "#d97706"; // foot match

        if (animalType === "cat") {
          legColor = "#fbbf24";
          feetColor = "#b45309";
        } else if (animalType === "dog") {
          legColor = "#a78bfa";
          feetColor = "#5b21b6";
        } else if (animalType === "owl") {
          legColor = "#38bdf8";
          feetColor = "#c2410c";
        } else if (animalType === "trax") {
          legColor = "#1e293b";
          feetColor = "#0f172a";
        } else if (animalType === "dino") {
          legColor = "#34d399";
          feetColor = "#064e3b";
        } else if (animalType === "frog") {
          legColor = "#a3e635";
          feetColor = "#3f6212";
        } else if (animalType === "pig") {
          legColor = "#f472b6";
          feetColor = "#be185d";
        } else if (animalType === "dobby") {
          legColor = "#dfd0c0";
          feetColor = "#bba795";
        } else if (animalType === "unicorn") {
          legColor = "#f8fafc";
          feetColor = "#fbbf24";
        } else if (animalType === "dragon") {
          legColor = "#10b981";
          feetColor = "#047857";
        } else if (animalType === "panda") {
          legColor = "#1e293b";
          feetColor = "#0f172a";
        } else if (animalType === "pikachu") {
          legColor = "#facc15";
          feetColor = "#ca8a04";
        } else if (animalType === "axolotl") {
          legColor = "#fbcfe8";
          feetColor = "#db2777";
        } else if (animalType === "capybara") {
          legColor = "#b45309";
          feetColor = "#451a03";
        } else if (animalType === "shiba") {
          legColor = "#ea580c";
          feetColor = "#9a3412";
        } else if (animalType === "totoro") {
          legColor = "#94a3b8"; // beautiful soft gray
          feetColor = "#475569"; // slate dark grey
        } else if (animalType === "chopper") {
          legColor = "#b45309"; // reindeer brown
          feetColor = "#451a03"; // dark hoof brown
        } else if (animalType === "appa") {
          legColor = "#e2e8f0"; // soft white
          feetColor = "#475569"; // dark bison grey
        } else if (animalType === "grogu") {
          legColor = "#d97706"; // amber brown robe
          feetColor = "#86efac"; // light alien green feet
        } else if (animalType === "spongebob") {
          legColor = "#ffffff";
          feetColor = "#000000";
        } else if (animalType === "patrick") {
          legColor = "#fbcfe8";
          feetColor = "#fbcfe8";
        } else if (animalType === "hello_kitty") {
          legColor = "#ffffff";
          feetColor = "#ffffff";
        } else if (animalType === "bluey") {
          legColor = "#93c5fd";
          feetColor = "#3b82f6";
        }

        // Foot placement parameters
        const footY = size * 0.95;
        const footRadius = size * 0.15;
        const leftFootX = -size * 0.38;
        const rightFootX = size * 0.38;

        // Cute petite fast walking step frequency
        const swingSpeed = 14.5;

        // Out-of-phase left/right leg horizontal swaying
        const walkSwing = isMoving ? (isDashboard ? 0.04 : 0.22) : 0;
        const leftSwingX = isMoving
          ? Math.sin(time * swingSpeed) * (size * walkSwing)
          : 0;
        const rightSwingX = isMoving
          ? Math.sin(time * swingSpeed + Math.PI) * (size * walkSwing)
          : 0;

        // Lift legs in alternate stepping phases - LARGER STEPS
        const liftScale = isMoving ? (isDashboard ? 0.05 : 0.35) : 0;
        const leftYOffset = isMoving
          ? Math.max(0, -Math.cos(time * swingSpeed)) * (size * liftScale)
          : 0;
        const rightYOffset = isMoving
          ? Math.max(0, Math.cos(time * swingSpeed)) * (size * liftScale)
          : 0;

        // Actual positions
        const leftFootCurrX = leftFootX + leftSwingX;
        const leftFootCurrY = footY - leftYOffset;

        const rightFootCurrX = rightFootX + rightSwingX;
        const rightFootCurrY = footY - rightYOffset;

        // 1. Draw LEFT leg (shaft starting from pet body base)
        // Outer border
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = size * 0.22;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(leftFootX, size * 0.45);
        ctx.lineTo(leftFootCurrX, leftFootCurrY);
        ctx.stroke();

        // Inner fill
        ctx.strokeStyle = legColor;
        ctx.lineWidth = size * 0.12;
        ctx.beginPath();
        ctx.moveTo(leftFootX, size * 0.45);
        ctx.lineTo(leftFootCurrX, leftFootCurrY);
        ctx.stroke();

        // Draw Left Foot
        ctx.fillStyle = "#1e293b"; // shadow backing
        ctx.beginPath();
        ctx.arc(leftFootCurrX, leftFootCurrY, footRadius + 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = feetColor;
        ctx.beginPath();
        ctx.arc(leftFootCurrX, leftFootCurrY, footRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw RIGHT leg (shaft starting from pet body base)
        // Outer border
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = size * 0.22;
        ctx.beginPath();
        ctx.moveTo(rightFootX, size * 0.45);
        ctx.lineTo(rightFootCurrX, rightFootCurrY);
        ctx.stroke();

        // Inner fill
        ctx.strokeStyle = legColor;
        ctx.lineWidth = size * 0.12;
        ctx.beginPath();
        ctx.moveTo(rightFootX, size * 0.45);
        ctx.lineTo(rightFootCurrX, rightFootCurrY);
        ctx.stroke();

        // Draw Right Foot
        ctx.fillStyle = "#1e293b"; // shadow backing
        ctx.beginPath();
        ctx.arc(
          rightFootCurrX,
          rightFootCurrY,
          footRadius + 1.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.fillStyle = feetColor;
        ctx.beginPath();
        ctx.arc(rightFootCurrX, rightFootCurrY, footRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      const drawStar = (
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        r: number,
      ) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(
            Math.cos(((18 + i * 72) * Math.PI) / 180) * r + cx,
            Math.sin(((18 + i * 72) * Math.PI) / 180) * r + cy,
          );
          ctx.lineTo(
            Math.cos(((54 + i * 72) * Math.PI) / 180) * (r * 0.4) + cx,
            Math.sin(((54 + i * 72) * Math.PI) / 180) * (r * 0.4) + cy,
          );
        }
        ctx.closePath();
        ctx.fill();
      };

      const drawLearningBook = (
        ctx: CanvasRenderingContext2D,
        size: number,
      ) => {
        ctx.save();
        // Position on ground in front of learning companion
        ctx.translate(size * 0.9, size * 0.7);
        ctx.rotate(-0.06); // skewed slightly for homey organic warmth

        // 1. Soft cover leather backing shadow
        ctx.fillStyle = "#b91c1c"; // deep red/burgundy hardcover
        ctx.beginPath();
        ctx.ellipse(
          -size * 0.35,
          size * 0.05,
          size * 0.46,
          size * 0.36,
          0.04,
          0,
          Math.PI * 2,
        );
        ctx.ellipse(
          size * 0.35,
          size * 0.05,
          size * 0.46,
          size * 0.36,
          -0.04,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.strokeStyle = "#7f1d1d";
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 2. High fidelity paper pages with central crease gradient
        const pageGrad = ctx.createLinearGradient(
          -size * 0.7,
          0,
          size * 0.7,
          0,
        );
        pageGrad.addColorStop(0, "#fef08a"); // page edges
        pageGrad.addColorStop(0.12, "#fffbeb"); // cream white Left Page
        pageGrad.addColorStop(0.48, "#cbd5e1"); // shadow in middle spine
        pageGrad.addColorStop(0.52, "#e2e8f0"); // other side spine edge
        pageGrad.addColorStop(0.88, "#fffbeb"); // cream white Right Page
        pageGrad.addColorStop(1, "#fef08a");
        ctx.fillStyle = pageGrad;

        // Left page
        ctx.beginPath();
        ctx.moveTo(0, size * 0.15);
        ctx.bezierCurveTo(
          -size * 0.3,
          -size * 0.25,
          -size * 0.6,
          -size * 0.2,
          -size * 0.75,
          -size * 0.1,
        );
        ctx.lineTo(-size * 0.7, size * 0.35);
        ctx.bezierCurveTo(
          -size * 0.6,
          size * 0.2,
          -size * 0.3,
          size * 0.15,
          0,
          size * 0.35,
        );
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Right page
        ctx.beginPath();
        ctx.moveTo(0, size * 0.15);
        ctx.bezierCurveTo(
          size * 0.3,
          -size * 0.25,
          size * 0.6,
          -size * 0.2,
          size * 0.75,
          -size * 0.1,
        );
        ctx.lineTo(size * 0.7, size * 0.35);
        ctx.bezierCurveTo(
          size * 0.6,
          size * 0.2,
          size * 0.3,
          size * 0.15,
          0,
          size * 0.35,
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Cute text lines simulation
        ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";

        // Left Page Lines
        ctx.beginPath();
        ctx.moveTo(-size * 0.55, -size * 0.04);
        ctx.lineTo(-size * 0.2, -size * 0.01);
        ctx.moveTo(-size * 0.58, size * 0.08);
        ctx.lineTo(-size * 0.18, size * 0.11);
        ctx.moveTo(-size * 0.52, size * 0.2);
        ctx.lineTo(-size * 0.24, size * 0.22);
        ctx.stroke();

        // Right Page Lines
        ctx.beginPath();
        ctx.moveTo(size * 0.18, -size * 0.01);
        ctx.lineTo(size * 0.55, -size * 0.04);
        ctx.moveTo(size * 0.15, size * 0.11);
        ctx.lineTo(size * 0.58, size * 0.08);
        ctx.moveTo(size * 0.24, size * 0.22);
        ctx.lineTo(size * 0.52, size * 0.2);
        ctx.stroke();

        // 4. Little pink/red silk bookmark ribbon hanging out of the bottom
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(0, size * 0.25);
        ctx.lineTo(-size * 0.08, size * 0.58);
        ctx.lineTo(size * 0.04, size * 0.62);
        ctx.lineTo(0.06, size * 0.25);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      };

      const drawBirthdayCake = (
        ctx: CanvasRenderingContext2D,
        size: number,
        names: string,
        time: number,
      ) => {
        ctx.save();
        // Position next to the pet, opposite of book or similar
        ctx.translate(-size * 1.2, size * 0.4);

        ctx.save();
        ctx.rotate(0.04 * Math.sin(time * 2));

        // Plate
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.4, size * 0.6, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cake Base
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.ellipse(
          0,
          size * 0.35,
          size * 0.45,
          size * 0.12,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillRect(-size * 0.45, size * 0.05, size * 0.9, size * 0.3);
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.ellipse(
          0,
          size * 0.05,
          size * 0.45,
          size * 0.12,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Frosting
        ctx.fillStyle = "#ec4899";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.02, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drips
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(
            -size * 0.3 + i * (size * 0.2),
            size * 0.05,
            size * 0.08,
            0,
            Math.PI,
          );
          ctx.fill();
        }

        // Candle
        ctx.fillStyle = "#fffbeb";
        ctx.fillRect(-size * 0.05, -size * 0.15, size * 0.1, size * 0.15);

        // Flame
        ctx.fillStyle = "#f97316";
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 10);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.3 - size * 0.05 * Math.sin(time * 15));
        ctx.quadraticCurveTo(size * 0.08, -size * 0.2, 0, -size * 0.15);
        ctx.quadraticCurveTo(
          -size * 0.08,
          -size * 0.2,
          0,
          -size * 0.3 - size * 0.05 * Math.sin(time * 15),
        );
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.restore();

        // Sign (Happy Birthday Name)
        ctx.save();
        ctx.translate(0, -size * 0.5);
        ctx.rotate(-0.05 + 0.02 * Math.sin(time));
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(-size, -size * 0.3, size * 2.0, size * 0.6, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${size * 0.2}px "Inter", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Happy Birthday,", 0, -size * 0.1);
        ctx.fillStyle = "#fde047";
        // If names are very long, truncate
        const displayNames =
          names.length > 15 ? names.substring(0, 15) + "..." : names;
        ctx.fillText(displayNames + "!", 0, size * 0.15);
        ctx.restore();

        ctx.restore();
      };

      const drawStandardEyes = (
        ctx: CanvasRenderingContext2D,
        size: number,
        leftX: number,
        rightX: number,
        eyeY: number,
        eyeRad: number,
        pupilRad: number,
        eyeMode: string,
      ) => {
        const p = stateRef.current.pet;
        const esc = p.eyeScaleY !== undefined ? p.eyeScaleY : 1.0;

        // CLAMP PUPIL OFFSETS TO PREVENT BLACK PUPILS FROM LEAVING THE WHITE OF THE EYE
        let dx = pupilOffsetX * (eyeRad / (size * 0.25));
        let dy = pupilOffsetY * (eyeRad / (size * 0.25));
        const maxDist = Math.max(0, eyeRad - pupilRad - 1.0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist && dist > 0) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        if (eyeMode === "happy") {
          // Cheeks blush
          ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
          ctx.beginPath();
          ctx.arc(
            leftX - size * 0.12,
            eyeY + eyeRad * 0.9,
            size * 0.18,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            rightX + size * 0.12,
            eyeY + eyeRad * 0.9,
            size * 0.18,
            0,
            Math.PI * 2,
          );
          ctx.fill();

          // Clear white outline backing
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(leftX, eyeY, eyeRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rightX, eyeY, eyeRad, 0, Math.PI * 2);
          ctx.fill();

          // Curved lines (^ _ ^)
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = Math.max(2.5, size * 0.08);
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.arc(leftX, eyeY + eyeRad * 0.25, eyeRad * 0.7, Math.PI, 0, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(
            rightX,
            eyeY + eyeRad * 0.25,
            eyeRad * 0.7,
            Math.PI,
            0,
            false,
          );
          ctx.stroke();
        } else if (eyeMode === "sleepy" || esc < 1.0) {
          // Downward curved eyelashes (u _ u)
          // Cheeks blush
          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.beginPath();
          ctx.arc(
            leftX - size * 0.1,
            eyeY + eyeRad * 0.9,
            size * 0.15,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            rightX + size * 0.1,
            eyeY + eyeRad * 0.9,
            size * 0.15,
            0,
            Math.PI * 2,
          );
          ctx.fill();

          if (esc > 0.05) {
            // Render closing eyeballs (whites and pupils squishing down in height)
            ctx.save();

            // Left Eye
            ctx.save();
            ctx.translate(leftX, eyeY);
            ctx.scale(1, esc);
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(0, 0, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "black";
            const plX = dx;
            const plY = dy;
            ctx.beginPath();
            ctx.arc(plX, plY, pupilRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(
              plX - pupilRad * 0.35,
              plY - pupilRad * 0.35,
              pupilRad * 0.3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();

            // Right Eye
            ctx.save();
            ctx.translate(rightX, eyeY);
            ctx.scale(1, esc);
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(0, 0, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "black";
            const prX = dx;
            const prY = dy;
            ctx.beginPath();
            ctx.arc(prX, prY, pupilRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(
              prX - pupilRad * 0.35,
              prY - pupilRad * 0.35,
              pupilRad * 0.3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();

            ctx.restore();
          }

          // Draw eyelids/sleepy curves (u _ u)
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = Math.max(3.5, size * 0.12);
          ctx.lineCap = "round";

          ctx.save();
          ctx.globalAlpha = 1.0 - esc; // Fade in eyelid line as eye closes
          ctx.beginPath();
          ctx.arc(
            leftX,
            eyeY - eyeRad * 0.15,
            eyeRad * 0.85,
            0.12 * Math.PI,
            0.88 * Math.PI,
            false,
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(
            rightX,
            eyeY - eyeRad * 0.15,
            eyeRad * 0.85,
            0.12 * Math.PI,
            0.88 * Math.PI,
            false,
          );
          ctx.stroke();
          ctx.restore();
        } else {
          // Normal / Sparkle
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(leftX, eyeY, eyeRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(rightX, eyeY, eyeRad, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "black";
          const plX = leftX + dx;
          const plY = eyeY + dy;
          const prX = rightX + dx;
          const prY = eyeY + dy;

          ctx.beginPath();
          ctx.arc(plX, plY, pupilRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(prX, prY, pupilRad, 0, Math.PI * 2);
          ctx.fill();

          if (eyeMode === "sparkle") {
            ctx.fillStyle = "#fef08a";
            drawStar(ctx, plX, plY, pupilRad * 0.75);
            drawStar(ctx, prX, prY, pupilRad * 0.75);
          } else {
            // Little pupil reflection
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(
              plX - pupilRad * 0.35,
              plY - pupilRad * 0.35,
              pupilRad * 0.3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
              prX - pupilRad * 0.35,
              prY - pupilRad * 0.35,
              pupilRad * 0.3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }

        // Draw worried pleading eyebrows if the classroom is noisy or pet is sad!
        const noiseWorry = (window as any).__lastNoiseVolume || 0;
        const noiseLimit = (window as any).__noiseThreshold || 40;
        if (
          (noiseWorry >= noiseLimit * 0.5 || eyeMode === "sad") &&
          eyeMode !== "sleepy" &&
          eyeMode !== "happy"
        ) {
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = Math.max(2.2, size * 0.065);
          ctx.lineCap = "round";

          ctx.save();
          ctx.beginPath();
          // Left eyebrow (slanted slightly /)
          ctx.moveTo(leftX - eyeRad * 0.75, eyeY - eyeRad * 0.65);
          ctx.lineTo(leftX + eyeRad * 0.3, eyeY - eyeRad * 0.95);
          // Right eyebrow (slanted slightly \)
          ctx.moveTo(rightX + eyeRad * 0.75, eyeY - eyeRad * 0.65);
          ctx.lineTo(rightX - eyeRad * 0.3, eyeY - eyeRad * 0.95);
          ctx.stroke();
          ctx.restore();
        }

        if (eyeMode === "sad") {
          // Draw tears
          ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
          ctx.beginPath();
          const tearY = eyeY + eyeRad * 0.9 + Math.sin(Date.now() / 200) * 2;
          ctx.arc(leftX - eyeRad * 0.3, tearY, eyeRad * 0.3, 0, Math.PI * 2);
          ctx.arc(rightX + eyeRad * 0.3, tearY, eyeRad * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const drawCat = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
        earLag = 0,
        tailLag = 0,
      ) => {
        const moodVal =
          stateRef.current.mood !== undefined ? stateRef.current.mood : 75;
        const droop = Math.max(0, Math.min(1.0, (70 - moodVal) / 40));

        // Cat Tail (striped orange tail)
        ctx.save();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = size * 0.18;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.8);
        const tailSwing = tailLag * size * 0.8;
        ctx.bezierCurveTo(
          -size * 0.8 - tailSwing,
          size * 0.6,
          -size * 0.9 + tailSwing,
          -size * 0.1,
          -size * 0.7 + tailSwing * 1.5,
          -size * 0.5,
        );
        ctx.stroke();

        // Draw cute stripes on the tail
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = size * 0.16;
        ctx.setLineDash([size * 0.08, size * 0.15]);
        ctx.stroke();
        ctx.restore();

        // Base head with soft 3D radial gradient
        const headGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        headGrad.addColorStop(0, "#fef08a"); // yellow-orange highlight
        headGrad.addColorStop(0.35, "#fbbf24"); // warm gold
        headGrad.addColorStop(0.85, "#f59e0b"); // ginger orange
        headGrad.addColorStop(1, "#b45309"); // chestnut shadow
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Tiger stripes on Cat cheeks & forehead
        ctx.fillStyle = "#d97706";
        // Forehead stripes
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.95);
        ctx.lineTo(0, -size * 0.7);
        ctx.lineTo(size * 0.12, -size * 0.95);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-size * 0.08, -size * 0.65);
        ctx.lineTo(0, -size * 0.5);
        ctx.lineTo(size * 0.08, -size * 0.65);
        ctx.fill();

        // Left cheek stripes
        ctx.beginPath();
        ctx.moveTo(-size * 0.95, -size * 0.05);
        ctx.lineTo(-size * 0.65, 0);
        ctx.lineTo(-size * 0.95, size * 0.05);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-size * 0.9, size * 0.15);
        ctx.lineTo(-size * 0.65, size * 0.18);
        ctx.lineTo(-size * 0.9, size * 0.25);
        ctx.fill();

        // Right cheek stripes
        ctx.beginPath();
        ctx.moveTo(size * 0.95, -size * 0.05);
        ctx.lineTo(size * 0.65, 0);
        ctx.lineTo(size * 0.95, size * 0.05);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.9, size * 0.15);
        ctx.lineTo(size * 0.65, size * 0.18);
        ctx.lineTo(size * 0.9, size * 0.25);
        ctx.fill();

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.45, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Ears with earLag and droop
        const leftEarTipX =
          -size * 0.9 - droop * size * 0.15 + earLag * size * 0.45;
        const leftEarTipY = -size * 1.3 + droop * size * 0.2;
        const rightEarTipX =
          size * 0.9 + droop * size * 0.15 + earLag * size * 0.45;
        const rightEarTipY = -size * 1.3 + droop * size * 0.2;

        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, -size * 0.5);
        ctx.lineTo(leftEarTipX, leftEarTipY);
        ctx.lineTo(-size * 0.2, -size * 0.9);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(size * 0.8, -size * 0.5);
        ctx.lineTo(rightEarTipX, rightEarTipY);
        ctx.lineTo(size * 0.2, -size * 0.9);
        ctx.fill();

        // Inner ears (cozy pink)
        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, -size * 0.55);
        ctx.lineTo(
          leftEarTipX + size * 0.1 * (earLag >= 0 ? 1 : -1),
          leftEarTipY + size * 0.15,
        );
        ctx.lineTo(-size * 0.35, -size * 0.85);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(size * 0.7, -size * 0.55);
        ctx.lineTo(
          rightEarTipX - size * 0.1 * (earLag >= 0 ? 1 : -1),
          rightEarTipY + size * 0.15,
        );
        ctx.lineTo(size * 0.35, -size * 0.85);
        ctx.fill();

        // Cheeks blush (radial gradient for glowing look)
        const cheekGradL = ctx.createRadialGradient(-size * 0.55, size * 0.25, 0, -size * 0.55, size * 0.25, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.6)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.55, size * 0.25, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.55, size * 0.25, 0, size * 0.55, size * 0.25, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.6)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.55, size * 0.25, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Red Collar
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = size * 0.08;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.92, Math.PI * 0.22, Math.PI * 0.78, false);
        ctx.stroke();

        // Golden Bell
        const bellGrad = ctx.createRadialGradient(-size * 0.03, size * 0.88, 0, 0, size * 0.92, size * 0.12);
        bellGrad.addColorStop(0, "#fef08a");
        bellGrad.addColorStop(0.6, "#eab308");
        bellGrad.addColorStop(1, "#854d0e");
        ctx.fillStyle = bellGrad;
        ctx.beginPath();
        ctx.arc(0, size * 0.92, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#854d0e";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#451a03"; // bell hole
        ctx.beginPath();
        ctx.arc(0, size * 0.95, size * 0.035, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.35,
          size * 0.35,
          -size * 0.1,
          size * 0.25,
          size * 0.12,
          eyeMode,
        );

        // Nose
        ctx.fillStyle = "#f43f5e"; // soft coral red nose
        ctx.beginPath();
        ctx.arc(0, size * 0.18, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Cute cat smile under nose
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-size * 0.07, size * 0.23, size * 0.07, 0, Math.PI, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size * 0.07, size * 0.23, size * 0.07, 0, Math.PI, false);
        ctx.stroke();

        // Whiskers
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, size * 0.2);
        ctx.lineTo(-size * 1.1, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, size * 0.3);
        ctx.lineTo(-size * 1.1, size * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.4, size * 0.2);
        ctx.lineTo(size * 1.1, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.4, size * 0.3);
        ctx.lineTo(size * 1.1, size * 0.3);
        ctx.stroke();
      };

      const drawDog = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
        earLag = 0,
        tailLag = 0,
      ) => {
        const moodVal =
          stateRef.current.mood !== undefined ? stateRef.current.mood : 75;
        const droop = Math.max(0, Math.min(1.0, (70 - moodVal) / 40));

        // Dog Tail with white fluffy tip
        ctx.save();
        const tailGrad = ctx.createLinearGradient(size * 0.3, size * 0.8, size * 0.6, -size * 0.4);
        tailGrad.addColorStop(0, "#c084fc");
        tailGrad.addColorStop(0.7, "#a78bfa");
        tailGrad.addColorStop(1, "#fffbeb"); // white tip!
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = size * 0.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(size * 0.3, size * 0.8);
        const dogTailSwing = tailLag * size * 0.8;
        ctx.bezierCurveTo(
          size * 0.8 + dogTailSwing,
          size * 0.6,
          size * 0.9 - dogTailSwing,
          -size * 0.1,
          size * 0.6 - dogTailSwing * 1.5,
          -size * 0.4,
        );
        ctx.stroke();
        ctx.restore();

        // Base head with beautiful, soft radial purple 3D gradient
        const headGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        headGrad.addColorStop(0, "#ddd6fe"); // violet-white highlight
        headGrad.addColorStop(0.35, "#a78bfa"); // lavender
        headGrad.addColorStop(0.8, "#8b5cf6"); // deep purple
        headGrad.addColorStop(1, "#5b21b6"); // royal shadow
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // White chest patch at bottom
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.75, size * 0.5, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.45, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Ears (floppy with pink inner patch)
        const leftEarAngle = -0.2 + droop * 0.2 - earLag * 0.35;
        const rightEarAngle = 0.2 - droop * 0.2 - earLag * 0.35;

        // Left ear
        ctx.fillStyle = "#5b21b6";
        ctx.beginPath();
        ctx.ellipse(
          -size * 0.8 - droop * size * 0.08,
          droop * size * 0.15,
          size * 0.3,
          size * 0.7,
          leftEarAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Left Ear inner pink
        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.ellipse(
          -size * 0.76 - droop * size * 0.08,
          droop * size * 0.18,
          size * 0.18,
          size * 0.48,
          leftEarAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Right ear
        ctx.fillStyle = "#5b21b6";
        ctx.beginPath();
        ctx.ellipse(
          size * 0.8 + droop * size * 0.08,
          droop * size * 0.15,
          size * 0.3,
          size * 0.7,
          rightEarAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Right Ear inner pink
        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.ellipse(
          size * 0.76 + droop * size * 0.08,
          droop * size * 0.18,
          size * 0.18,
          size * 0.48,
          rightEarAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Cheeks blush
        const cheekGradL = ctx.createRadialGradient(-size * 0.52, size * 0.15, 0, -size * 0.52, size * 0.15, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.55)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.52, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.52, size * 0.15, 0, size * 0.52, size * 0.15, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.55)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.52, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Blue Collar
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = size * 0.08;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.92, Math.PI * 0.25, Math.PI * 0.75, false);
        ctx.stroke();

        // Golden medal tag with a star
        const medalGrad = ctx.createRadialGradient(-size * 0.02, size * 0.88, 0, 0, size * 0.92, size * 0.11);
        medalGrad.addColorStop(0, "#fef08a");
        medalGrad.addColorStop(0.7, "#fbbf24");
        medalGrad.addColorStop(1, "#ca8a04");
        ctx.fillStyle = medalGrad;
        ctx.beginPath();
        ctx.arc(0, size * 0.92, size * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Eyes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.3,
          size * 0.3,
          -size * 0.2,
          size * 0.22,
          size * 0.1,
          eyeMode,
        );

        // Snout
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(0, size * 0.28, size * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.18, size * 0.14, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nose sheen
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(-size * 0.04, size * 0.15, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Playful smiling mouth with tongue sticking out
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        if (eyeMode === "happy" || eyeMode === "excited") {
          ctx.save();
          ctx.fillStyle = "#fda4af"; // pink tongue
          ctx.beginPath();
          ctx.arc(0, size * 0.32, size * 0.12, 0, Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(-size * 0.07, size * 0.28, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(size * 0.07, size * 0.28, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
        }
      };

      const drawOwl = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Base body with soft 3D radial aqua-blue gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size * 1.1,
        );
        bodyGrad.addColorStop(0, "#e0f2fe"); // ice-blue highlight
        bodyGrad.addColorStop(0.4, "#38bdf8"); // sky blue
        bodyGrad.addColorStop(0.85, "#0ea5e9"); // core blue
        bodyGrad.addColorStop(1, "#0369a1"); // shadowed steel blue

        // Folded fluffy wings on the sides
        ctx.save();
        const wingGradL = ctx.createLinearGradient(-size * 1.1, -size * 0.2, -size * 0.7, size * 0.5);
        wingGradL.addColorStop(0, "#0ea5e9");
        wingGradL.addColorStop(1, "#0284c7");
        ctx.fillStyle = wingGradL;
        ctx.beginPath();
        ctx.ellipse(-size * 0.85, size * 0.1, size * 0.2, size * 0.5, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0369a1";
        ctx.lineWidth = 2;
        ctx.stroke();

        const wingGradR = ctx.createLinearGradient(size * 1.1, -size * 0.2, size * 0.7, size * 0.5);
        wingGradR.addColorStop(0, "#0ea5e9");
        wingGradR.addColorStop(1, "#0284c7");
        ctx.fillStyle = wingGradR;
        ctx.beginPath();
        ctx.ellipse(size * 0.85, size * 0.1, size * 0.2, size * 0.5, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Ear tufts (top corners of head drawn in background)
        ctx.fillStyle = "#0369a1";
        // Left tuft
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, -size * 0.6);
        ctx.lineTo(-size * 0.85, -size * 1.25);
        ctx.lineTo(-size * 0.3, -size * 0.8);
        ctx.fill();
        // Left Inner ear tuft pink highlights
        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.moveTo(-size * 0.68, -size * 0.7);
        ctx.lineTo(-size * 0.78, -size * 1.12);
        ctx.lineTo(-size * 0.4, -size * 0.8);
        ctx.fill();

        // Right tuft
        ctx.fillStyle = "#0369a1";
        ctx.beginPath();
        ctx.moveTo(size * 0.7, -size * 0.6);
        ctx.lineTo(size * 0.85, -size * 1.25);
        ctx.lineTo(size * 0.3, -size * 0.8);
        ctx.fill();
        // Right Inner ear tuft pink highlights
        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.moveTo(size * 0.68, -size * 0.7);
        ctx.lineTo(size * 0.78, -size * 1.12);
        ctx.lineTo(size * 0.4, -size * 0.8);
        ctx.fill();

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.9, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.25, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Giant owl eyes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.4,
          size * 0.4,
          -size * 0.2,
          size * 0.36,
          size * 0.15,
          eyeMode,
        );

        // Beak (3D golden gradient with a white shine)
        const beakGrad = ctx.createLinearGradient(0, size * 0.1, 0, size * 0.4);
        beakGrad.addColorStop(0, "#fef08a");
        beakGrad.addColorStop(0.5, "#f59e0b");
        beakGrad.addColorStop(1, "#b45309");
        ctx.fillStyle = beakGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.13, size * 0.1);
        ctx.lineTo(size * 0.13, size * 0.1);
        ctx.lineTo(0, size * 0.4);
        ctx.closePath();
        ctx.fill();
        // Beak highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.18, size * 0.03, size * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cheeks blush
        const cheekGradL = ctx.createRadialGradient(-size * 0.6, size * 0.2, 0, -size * 0.6, size * 0.2, size * 0.16);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.55)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.6, size * 0.2, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.6, size * 0.2, 0, size * 0.6, size * 0.2, size * 0.16);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.55)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.6, size * 0.2, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Detailed Scalloped Chest Feathers (Filled soft cream feathers)
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.strokeStyle = "rgba(2, 132, 199, 0.3)";
        ctx.lineWidth = 1.5;
        for (let row = 0; row < 2; row++) {
          const yOffset = size * (0.55 + row * 0.22);
          const xSpacing = size * 0.25;
          const cols = row === 0 ? 3 : 2;
          for (let col = 0; col < cols; col++) {
            const x = (col - (cols - 1) / 2) * xSpacing;
            ctx.beginPath();
            ctx.arc(x, yOffset, size * 0.08, 0, Math.PI, false);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      };

      const drawTrax = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Feathery wings in background
        ctx.save();
        const wingGradL = ctx.createLinearGradient(-size * 1.1, -size * 0.2, -size * 0.7, size * 0.5);
        wingGradL.addColorStop(0, "#334155");
        wingGradL.addColorStop(1, "#0f172a");
        ctx.fillStyle = wingGradL;
        ctx.beginPath();
        ctx.ellipse(-size * 0.85, size * 0.1, size * 0.2, size * 0.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#020617";
        ctx.lineWidth = 2;
        ctx.stroke();

        const wingGradR = ctx.createLinearGradient(size * 1.1, -size * 0.2, size * 0.7, size * 0.5);
        wingGradR.addColorStop(0, "#334155");
        wingGradR.addColorStop(1, "#0f172a");
        ctx.fillStyle = wingGradR;
        ctx.beginPath();
        ctx.ellipse(size * 0.85, size * 0.1, size * 0.2, size * 0.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Raven Tail feathers
        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, size * 0.6);
        ctx.quadraticCurveTo(-size * 1.1, size * 0.9, -size * 1.2, size * 0.5);
        ctx.quadraticCurveTo(-size * 0.9, size * 0.2, -size * 0.5, size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#020617";
        ctx.stroke();
        ctx.restore();

        // Main body gradient - deep shimmery raven black-blue
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size * 1.1,
        );
        bodyGrad.addColorStop(0, "#475569");
        bodyGrad.addColorStop(0.35, "#1e293b");
        bodyGrad.addColorStop(0.8, "#0f172a");
        bodyGrad.addColorStop(1, "#020617");
        ctx.fillStyle = bodyGrad;

        // Draw body ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.9, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Feather body highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.25, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Characteristic red neckerchief/bandana
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, size * 0.3);
        ctx.lineTo(size * 0.4, size * 0.3);
        ctx.lineTo(0, size * 0.7);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-size * 0.4, size * 0.3, size * 0.08, 0, Math.PI * 2);
        ctx.arc(size * 0.4, size * 0.3, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Golden math plus sign on the red neckerchief
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.08, size * 0.42);
        ctx.lineTo(size * 0.08, size * 0.42);
        ctx.moveTo(0, size * 0.34);
        ctx.lineTo(0, size * 0.5);
        ctx.stroke();

        // Intelligent eyes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.33,
          size * 0.33,
          -size * 0.2,
          size * 0.28,
          size * 0.11,
          eyeMode,
        );

        // Big pointy raven beak
        const beakGrad = ctx.createLinearGradient(0, size * 0.05, 0, size * 0.5);
        beakGrad.addColorStop(0, "#fef08a");
        beakGrad.addColorStop(0.5, "#f97316");
        beakGrad.addColorStop(1, "#c2410c");
        ctx.fillStyle = beakGrad;

        ctx.beginPath();
        ctx.moveTo(-size * 0.2, size * 0.05);
        ctx.lineTo(size * 0.2, size * 0.05);
        ctx.lineTo(0, size * 0.52);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#7c2d12";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.05);
        ctx.lineTo(0, size * 0.52);
        ctx.stroke();
      };

      const drawDino = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Dino tail (curved green shape in background with spikes)
        ctx.save();
        ctx.fillStyle = "#047857";
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, size * 0.5);
        ctx.quadraticCurveTo(-size * 1.5, size * 0.9, -size * 1.6, size * 0.4);
        ctx.quadraticCurveTo(-size * 1.2, size * 0.1, -size * 0.8, size * 0.3);
        ctx.closePath();
        ctx.fill();

        // 2 spikes on the tail
        ctx.fillStyle = "#f59e0b"; // golden yellow spikes
        ctx.beginPath();
        ctx.moveTo(-size * 1.5, size * 0.65);
        ctx.lineTo(-size * 1.75, size * 0.75);
        ctx.lineTo(-size * 1.45, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-size * 1.2, size * 0.45);
        ctx.lineTo(-size * 1.4, size * 0.5);
        ctx.lineTo(-size * 1.15, size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Base body with rich forest emerald gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size * 1.1,
        );
        bodyGrad.addColorStop(0, "#a7f3d0"); // mint highlight
        bodyGrad.addColorStop(0.4, "#34d399"); // emerald
        bodyGrad.addColorStop(0.85, "#10b981"); // vivid green
        bodyGrad.addColorStop(1, "#047857"); // deep shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.25, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Dino back spots (soft golden dots)
        ctx.fillStyle = "rgba(251, 191, 36, 0.6)";
        ctx.beginPath();
        ctx.arc(-size * 0.4, size * 0.4, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-size * 0.25, size * 0.65, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-size * 0.5, size * 0.15, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Back Scales (3D spikes on head/neck with amber colors)
        ctx.fillStyle = "#f59e0b";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-size * 0.9, -size * 0.5 + i * size * 0.6);
          ctx.lineTo(-size * 1.25, -size * 0.3 + i * size * 0.6);
          ctx.lineTo(-size * 0.9, -size * 0.1 + i * size * 0.6);
          ctx.closePath();
          ctx.fill();
          // Scale outline
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Dino is sideways, single eye drawing
        const xl = size * 0.3;
        const yl = -size * 0.3;
        const rEye = size * 0.25;
        const rPupil = size * 0.1;

        const pDino = stateRef.current.pet;
        const escDino = pDino.eyeScaleY !== undefined ? pDino.eyeScaleY : 1.0;

        // Clamp Dino pupil offset
        let pdx = pupilOffsetX;
        let pdy = pupilOffsetY;
        const maxDinoDist = Math.max(0, rEye - rPupil - 1.0);
        const dinoDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (dinoDist > maxDinoDist && dinoDist > 0) {
          pdx = (pdx / dinoDist) * maxDinoDist;
          pdy = (pdy / dinoDist) * maxDinoDist;
        }

        // Cheek blush (glowing radial below the eye)
        const cheekGrad = ctx.createRadialGradient(size * 0.1, size * 0.12, 0, size * 0.1, size * 0.12, size * 0.16);
        cheekGrad.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGrad;
        ctx.beginPath();
        ctx.arc(size * 0.1, size * 0.12, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        if (eyeMode === "happy") {
          ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
          ctx.beginPath();
          ctx.arc(xl, yl + rEye, size * 0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = Math.max(3, size * 0.08);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(xl, yl + rEye * 0.25, rEye * 0.7, Math.PI, 0, false);
          ctx.stroke();
        } else if (eyeMode === "sleepy" || escDino < 1.0) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.beginPath();
          ctx.arc(xl, yl + rEye, size * 0.15, 0, Math.PI * 2);
          ctx.fill();

          if (escDino > 0.05) {
            ctx.save();
            ctx.translate(xl, yl);
            ctx.scale(1, escDino);

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(0, 0, rEye, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "black";
            const px = pdx;
            const py = pdy;
            ctx.beginPath();
            ctx.arc(px, py, rPupil, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(
              px - rPupil * 0.3,
              py - rPupil * 0.3,
              rPupil * 0.35,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
          }

          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = Math.max(3.5, size * 0.12);
          ctx.lineCap = "round";
          ctx.save();
          ctx.globalAlpha = 1.0 - escDino;
          ctx.beginPath();
          ctx.arc(
            xl,
            yl - rEye * 0.15,
            rEye * 0.85,
            0.12 * Math.PI,
            0.88 * Math.PI,
            false,
          );
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(xl, yl, rEye, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "black";
          const px = xl + pdx;
          const py = yl + pdy;
          ctx.beginPath();
          ctx.arc(px, py, rPupil, 0, Math.PI * 2);
          ctx.fill();

          if (eyeMode === "sparkle") {
            ctx.fillStyle = "#fef08a";
            drawStar(ctx, px, py, rPupil * 0.75);
          } else {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(
              px - rPupil * 0.3,
              py - rPupil * 0.3,
              rPupil * 0.35,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            // Tiny extra twinkle
            ctx.beginPath();
            ctx.arc(
              px + rPupil * 0.35,
              py + rPupil * 0.3,
              rPupil * 0.15,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }

        // Cute smiling mouth with a tiny fanged tooth
        ctx.strokeStyle = "#047857";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(size * 0.45, size * 0.25, size * 0.18, 0, Math.PI * 0.85, false);
        ctx.stroke();

        // White tooth fang!
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(size * 0.48, size * 0.28);
        ctx.lineTo(size * 0.52, size * 0.38);
        ctx.lineTo(size * 0.42, size * 0.32);
        ctx.closePath();
        ctx.fill();

        // Cute mini nose dot
        ctx.fillStyle = "#047857";
        ctx.beginPath();
        ctx.arc(size * 0.7, size * 0.1, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawFrog = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Base head with bright marsh-green 3D radial gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size * 1.25,
        );
        bodyGrad.addColorStop(0, "#d9f99d"); // bright lime highlight
        bodyGrad.addColorStop(0.4, "#a3e635"); // grass green
        bodyGrad.addColorStop(0.85, "#84cc16"); // lime core
        bodyGrad.addColorStop(1, "#4f7a28"); // dark forest under-shade
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.2, size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Frog cream belly patch
        ctx.fillStyle = "#f7fee7";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.42, size * 0.55, size * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.3, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Frog eye bulbs popping up (Gradient-shaded)
        [-1, 1].forEach((side) => {
          const bulbGrad = ctx.createRadialGradient(
            side * size * 0.55, -size * 0.65, size * 0.05,
            side * size * 0.6, -size * 0.7, size * 0.4
          );
          bulbGrad.addColorStop(0, "#d9f99d");
          bulbGrad.addColorStop(0.7, "#a3e635");
          bulbGrad.addColorStop(1, "#4f7a28");
          ctx.fillStyle = bulbGrad;
          ctx.beginPath();
          ctx.arc(side * size * 0.6, -size * 0.7, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Eyes rendering
        drawStandardEyes(
          ctx,
          size,
          -size * 0.6,
          size * 0.6,
          -size * 0.7,
          size * 0.25,
          size * 0.1,
          eyeMode,
        );

        // Rosy Cheeks (Radial gradient)
        const cheekGradL = ctx.createRadialGradient(-size * 0.65, size * 0.05, 0, -size * 0.65, size * 0.05, size * 0.16);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.65, size * 0.05, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.65, size * 0.05, 0, size * 0.65, size * 0.05, size * 0.16);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.65, size * 0.05, size * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Cute smiling open mouth with a pink tongue
        ctx.strokeStyle = "#3f6212";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        if (eyeMode === "happy" || eyeMode === "excited") {
          ctx.save();
          // Open mouth
          ctx.fillStyle = "#fb7185"; // pink mouth/tongue
          ctx.beginPath();
          ctx.arc(0, size * 0.1, size * 0.35, 0, Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(0, size * 0.1, size * 0.45, 0.05 * Math.PI, 0.95 * Math.PI, false);
          ctx.stroke();
        }

        // Beautiful little four-leaf clover sitting on the head (for good luck!)
        ctx.save();
        ctx.translate(0, -size * 0.9);
        ctx.fillStyle = "#22c55e"; // luck green
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, -size * 0.08, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Stem
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.quadraticCurveTo(size * 0.05, size * 0.12, size * 0.02, size * 0.2);
        ctx.stroke();
        ctx.restore();
      };

      const drawPig = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Pig curly tail
        ctx.save();
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = size * 0.12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, size * 0.8);
        ctx.bezierCurveTo(
          -size * 0.8, size * 0.9,
          -size * 0.9, size * 0.5,
          -size * 0.6, size * 0.4
        );
        ctx.stroke();
        ctx.restore();

        // Base shape with sweet bubblegum pink 3D gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#fbcfe8"); // pale rose
        bodyGrad.addColorStop(0.4, "#f472b6"); // hot pink
        bodyGrad.addColorStop(0.85, "#ec4899"); // pink-magenta
        bodyGrad.addColorStop(1, "#db2777"); // deep pink contour shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Cute floppy pig ears with dark pink contour and fold!
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.5, -size * 0.65);
          ctx.rotate(side * 0.15);

          // Ear Base
          ctx.fillStyle = "#db2777";
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.24, size * 0.42, -side * 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Ear fold inner
          ctx.fillStyle = "#fbcfe8";
          ctx.beginPath();
          ctx.ellipse(0, size * 0.1, size * 0.16, size * 0.28, -side * 0.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // 3D Pig Snout back plate (Soft pink gradient with white highlights)
        const snoutGrad = ctx.createRadialGradient(
          -size * 0.05, size * 0.15, 0,
          0, size * 0.2, size * 0.4
        );
        snoutGrad.addColorStop(0, "#ffe4e6");
        snoutGrad.addColorStop(0.7, "#fce7f3");
        snoutGrad.addColorStop(1, "#f472b6");
        ctx.fillStyle = snoutGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.2, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#db2777";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Snout Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, size * 0.1, size * 0.1, size * 0.04, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Snout nostrils
        ctx.fillStyle = "#be185d";
        ctx.beginPath();
        ctx.arc(-size * 0.16, size * 0.2, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.16, size * 0.2, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Glowing cheeks blush (radial)
        const cheekGradL = ctx.createRadialGradient(-size * 0.6, size * 0.1, 0, -size * 0.6, size * 0.1, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.6, size * 0.1, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.6, size * 0.1, 0, size * 0.6, size * 0.1, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.6, size * 0.1, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Smiling mouth line under snout
        ctx.strokeStyle = "#881337";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, size * 0.36, size * 0.14, 0, Math.PI, false);
        ctx.stroke();

        // Eyes rendering
        drawStandardEyes(
          ctx,
          size,
          -size * 0.3,
          size * 0.3,
          -size * 0.2,
          size * 0.16,
          size * 0.08,
          eyeMode,
        );
      };

      const drawDobby = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
        earLag = 0,
      ) => {
        const moodVal =
          stateRef.current.mood !== undefined ? stateRef.current.mood : 75;
        const droop = Math.max(0, Math.min(1.0, (70 - moodVal) / 40));

        // Base head with soft 3D radial gradient
        const headGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        headGrad.addColorStop(0, "#fef6ee"); // soft skin highlight
        headGrad.addColorStop(0.5, "#e5d5c5"); // mid tone
        headGrad.addColorStop(0.85, "#cbd5e1"); // soft shadow blending
        headGrad.addColorStop(1, "#94a3b8"); // cool shadow tone
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.45, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Ears pointing sideways and down slightly, flopping based on earLag or mood
        const leftEarTipX = -size * 1.85 + earLag * size * 0.5;
        const leftEarTipY = size * 0.2 + droop * size * 0.5;
        const rightEarTipX = size * 1.85 + earLag * size * 0.5;
        const rightEarTipY = size * 0.2 + droop * size * 0.5;

        // Draw Ears with beautiful soft 3D gradient
        const earGradL = ctx.createLinearGradient(-size * 0.6, -size * 0.4, leftEarTipX, leftEarTipY);
        earGradL.addColorStop(0, "#e5d5c5");
        earGradL.addColorStop(1, "#c8b4a2");
        ctx.fillStyle = earGradL;

        // Left Ear
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, -size * 0.4);
        ctx.quadraticCurveTo(-size * 1.2, -size * 0.6, leftEarTipX, leftEarTipY);
        ctx.quadraticCurveTo(-size * 0.8, size * 0.3, -size * 0.6, size * 0.4);
        ctx.fill();

        // Left Ear Inner (pinkish/warm tone)
        const innerEarGradL = ctx.createLinearGradient(-size * 0.55, -size * 0.3, leftEarTipX + size * 0.2, leftEarTipY);
        innerEarGradL.addColorStop(0, "#fda4af");
        innerEarGradL.addColorStop(1, "#f3bfae");
        ctx.fillStyle = innerEarGradL;
        ctx.beginPath();
        ctx.moveTo(-size * 0.55, -size * 0.3);
        ctx.quadraticCurveTo(-size * 1.0, -size * 0.45, leftEarTipX + size * 0.2, leftEarTipY);
        ctx.quadraticCurveTo(-size * 0.7, size * 0.2, -size * 0.55, size * 0.3);
        ctx.fill();

        // Right Ear
        const earGradR = ctx.createLinearGradient(size * 0.6, -size * 0.4, rightEarTipX, rightEarTipY);
        earGradR.addColorStop(0, "#e5d5c5");
        earGradR.addColorStop(1, "#c8b4a2");
        ctx.fillStyle = earGradR;
        ctx.beginPath();
        ctx.moveTo(size * 0.6, -size * 0.4);
        ctx.quadraticCurveTo(size * 1.2, -size * 0.6, rightEarTipX, rightEarTipY);
        ctx.quadraticCurveTo(size * 0.8, size * 0.3, size * 0.6, size * 0.4);
        ctx.fill();

        // Right Ear Inner
        const innerEarGradR = ctx.createLinearGradient(size * 0.55, -size * 0.3, rightEarTipX - size * 0.2, rightEarTipY);
        innerEarGradR.addColorStop(0, "#fda4af");
        innerEarGradR.addColorStop(1, "#f3bfae");
        ctx.fillStyle = innerEarGradR;
        ctx.beginPath();
        ctx.moveTo(size * 0.55, -size * 0.3);
        ctx.quadraticCurveTo(size * 1.0, -size * 0.45, rightEarTipX - size * 0.2, rightEarTipY);
        ctx.quadraticCurveTo(size * 0.7, size * 0.2, size * 0.55, size * 0.3);
        ctx.fill();

        // Pillowcase/Tattered Toga (clothing) around torso (beautiful 3D linen)
        const togaGrad = ctx.createLinearGradient(-size * 0.5, size * 0.7, size * 0.5, size * 1.15);
        togaGrad.addColorStop(0, "#f8fafc");
        togaGrad.addColorStop(0.5, "#f1f5f9");
        togaGrad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = togaGrad;
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.55, size * 0.7);
        ctx.lineTo(size * 0.55, size * 0.7);
        ctx.lineTo(size * 0.45, size * 1.15);
        ctx.lineTo(-size * 0.45, size * 1.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw some beautiful hand-knit stitch lines / patches
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.8);
        ctx.lineTo(size * 0.3, size * 0.8);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw some tatters / rips
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.7);
        ctx.lineTo(-size * 0.2, size * 0.85);
        ctx.lineTo(-size * 0.1, size * 0.7);
        ctx.strokeStyle = "#64748b";
        ctx.stroke();

        // Big green tennis-ball-like eyes! (Very glossy)
        const eyeXOffset = size * 0.38;
        const eyeY = -size * 0.1;
        const eyeRad = size * 0.32; // massive!
        const pupilRad = size * 0.14;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY - eyeRad * 0.1, eyeRad * 0.85, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            // Cheeks blush (glowing radial)
            const cheekGrad = ctx.createRadialGradient(ex, eyeY + eyeRad * 0.7, 0, ex, eyeY + eyeRad * 0.7, size * 0.18);
            cheekGrad.addColorStop(0, "rgba(244, 114, 182, 0.65)");
            cheekGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
            ctx.fillStyle = cheekGrad;
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.7, size * 0.18, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.2, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          // Normal Dobby Big Green Eyes
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            
            // Soft blush
            const cheekGrad = ctx.createRadialGradient(ex, eyeY + eyeRad * 0.8, 0, ex, eyeY + eyeRad * 0.8, size * 0.16);
            cheekGrad.addColorStop(0, "rgba(244, 114, 182, 0.55)");
            cheekGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
            ctx.fillStyle = cheekGrad;
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.8, size * 0.16, 0, Math.PI * 2);
            ctx.fill();

            // Eye whites
            ctx.fillStyle = "#fafae6";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Iris (tennis ball green 3D radial)
            const irisRad = eyeRad * 0.68;
            const irisGrad = ctx.createRadialGradient(ex - irisRad * 0.2, eyeY - irisRad * 0.2, 0, ex, eyeY, irisRad);
            irisGrad.addColorStop(0, "#a3e635"); // lime highlight
            irisGrad.addColorStop(0.7, "#84cc16"); // bright lime
            irisGrad.addColorStop(1, "#4d7c0f"); // forest shadow
            ctx.fillStyle = irisGrad;
            ctx.beginPath();
            ctx.arc(ex, eyeY, irisRad, 0, Math.PI * 2);
            ctx.fill();

            // Pupil
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(ex, eyeY, pupilRad, 0, Math.PI * 2);
            ctx.fill();

            // Multi-point catchlights for extremely glossy eye look
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(ex - pupilRad * 0.4, eyeY - pupilRad * 0.4, pupilRad * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(ex + pupilRad * 0.4, eyeY + pupilRad * 0.3, pupilRad * 0.18, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Long pointy wizard-elf nose
        ctx.fillStyle = "#c8b4a2";
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.1);
        ctx.quadraticCurveTo(-size * 0.16, size * 0.15, 0, size * 0.32);
        ctx.quadraticCurveTo(size * 0.16, size * 0.15, 0, -size * 0.1);
        ctx.fill();
        ctx.strokeStyle = "#a59582";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Friendly smile
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        if (eyeMode === "sad") {
          ctx.arc(0, size * 0.5, size * 0.2, Math.PI, 0, false);
        } else {
          ctx.arc(0, size * 0.38, size * 0.22, 0, Math.PI, false);
        }
        ctx.stroke();

        // Draw a cute pink-and-white striped SOCK hanging on his right side!
        ctx.save();
        ctx.translate(size * 0.55, size * 0.85);
        ctx.rotate(0.2);
        
        // Sock leg
        ctx.fillStyle = "#fda4af"; // cute pink knit sock
        ctx.fillRect(-size * 0.1, -size * 0.25, size * 0.2, size * 0.3);
        // White stripes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-size * 0.1, -size * 0.16, size * 0.2, size * 0.05);
        ctx.fillRect(-size * 0.1, -size * 0.02, size * 0.2, size * 0.05);
        
        // Sock foot
        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.ellipse(size * 0.05, size * 0.05, size * 0.16, size * 0.11, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      };

      const drawUnicorn = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Base head with pearlescent white gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#ffffff"); // pristine white
        bodyGrad.addColorStop(0.6, "#f8fafc"); // light slate
        bodyGrad.addColorStop(1, "#cbd5e1"); // soft gray shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Sparkles in the background/around horn (magical cross sparkles)
        ctx.fillStyle = "#fef08a"; // bright golden sparkles
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.4, -size * 1.3);
          // Draw star sparkle shape
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(2, -2);
          ctx.lineTo(10, 0);
          ctx.lineTo(2, 2);
          ctx.lineTo(0, 10);
          ctx.lineTo(-2, 2);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-2, -2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Beautiful flowy mane in background (multi-layered pastel rainbow colors with 3D gradients!)
        ctx.save();
        const maneColors = [
          { c0: "#fda4af", c1: "#f43f5e" }, // rose pink
          { c0: "#ddd6fe", c1: "#8b5cf6" }, // pastel purple
          { c0: "#bae6fd", c1: "#0ea5e9" }, // sky blue
          { c0: "#a7f3d0", c1: "#10b981" }, // mint green
        ];
        maneColors.forEach((colors, idx) => {
          const xPos = -size * 0.52 - idx * 5;
          const yPos = -size * 0.25 + idx * 8;
          const curlGrad = ctx.createRadialGradient(xPos, yPos, size * 0.05, xPos, yPos, size * 0.5);
          curlGrad.addColorStop(0, colors.c0);
          curlGrad.addColorStop(1, colors.c1);
          ctx.fillStyle = curlGrad;
          ctx.beginPath();
          ctx.ellipse(xPos, yPos, size * 0.45, size * 0.25, -0.4 - idx * 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        ctx.restore();

        // Cute horse muzzle
        const muzzleGrad = ctx.createRadialGradient(0, size * 0.3, 0, 0, size * 0.3, size * 0.5);
        muzzleGrad.addColorStop(0, "#ffe4e6");
        muzzleGrad.addColorStop(0.7, "#fce7f3");
        muzzleGrad.addColorStop(1, "#f472b6");
        ctx.fillStyle = muzzleGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.35, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nostrils
        ctx.fillStyle = "#db2777";
        ctx.beginPath();
        ctx.arc(-size * 0.15, size * 0.38, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.15, size * 0.38, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Magical Horn (Golden helical horn on forehead)
        const hornGrad = ctx.createLinearGradient(-size * 0.15, -size * 1.5, size * 0.15, -size * 0.7);
        hornGrad.addColorStop(0, "#fef08a"); // radiant yellow-gold
        hornGrad.addColorStop(0.5, "#fbbf24"); // rich gold
        hornGrad.addColorStop(1, "#b45309"); // warm amber shadow
        ctx.fillStyle = hornGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.16, -size * 0.7);
        ctx.lineTo(0, -size * 1.6); // tall pointed horn
        ctx.lineTo(size * 0.16, -size * 0.7);
        ctx.closePath();
        ctx.fill();

        // Helical ridges on horn
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, -size * 0.9);
        ctx.lineTo(size * 0.12, -size * 1.1);
        ctx.moveTo(-size * 0.08, -size * 1.2);
        ctx.lineTo(size * 0.08, -size * 1.4);
        ctx.stroke();

        // Cute horse ears
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, -size * 0.4);
        ctx.lineTo(-size * 0.8, -size * 1.15);
        ctx.lineTo(-size * 0.3, -size * 0.7);
        ctx.fill();
        ctx.fillStyle = "#fbcfe8"; // ear inner pink
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, -size * 0.5);
        ctx.lineTo(-size * 0.7, -size * 0.98);
        ctx.lineTo(-size * 0.4, -size * 0.7);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(size * 0.7, -size * 0.4);
        ctx.lineTo(size * 0.8, -size * 1.15);
        ctx.lineTo(size * 0.3, -size * 0.7);
        ctx.fill();
        ctx.fillStyle = "#fbcfe8";
        ctx.beginPath();
        ctx.moveTo(size * 0.6, -size * 0.5);
        ctx.lineTo(size * 0.7, -size * 0.98);
        ctx.lineTo(size * 0.4, -size * 0.7);
        ctx.fill();

        // Glowing cheeks blush (radial)
        const cheekGradL = ctx.createRadialGradient(-size * 0.55, size * 0.15, 0, -size * 0.55, size * 0.15, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.55, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.55, size * 0.15, 0, size * 0.55, size * 0.15, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.55, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Magical golden star on cheek
        ctx.fillStyle = "#fcd34d";
        drawStar(ctx, size * 0.45, size * 0.05, size * 0.12);

        // Eyes rendering with starry eyelashes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.35,
          size * 0.35,
          -size * 0.1,
          size * 0.22,
          size * 0.11,
          eyeMode === "normal" ? "sparkle" : eyeMode,
        );
      };

      const drawDragon = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Base body with majestic emerald gradient
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#a7f3d0"); // bright emerald highlight
        bodyGrad.addColorStop(0.4, "#10b981"); // rich emerald green
        bodyGrad.addColorStop(0.85, "#047857"); // dark teal green
        bodyGrad.addColorStop(1, "#064e3b"); // shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Dragon chest/belly plate (striped cream-yellow with 3D shadow)
        const chestGrad = ctx.createLinearGradient(-size * 0.3, size * 0.6, size * 0.3, size * 0.95);
        chestGrad.addColorStop(0, "#fffbeb");
        chestGrad.addColorStop(0.6, "#fef3c7");
        chestGrad.addColorStop(1, "#fde68a");
        ctx.fillStyle = chestGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.65, size * 0.5, size * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Horizontal stripes on chest plate
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        for (let y = size * 0.42; y <= size * 0.85; y += size * 0.12) {
          ctx.beginPath();
          ctx.moveTo(-size * 0.32, y);
          ctx.lineTo(size * 0.32, y);
          ctx.stroke();
        }

        // Tiny cute golden dragon horns (curved and highlighted)
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.3, -size * 0.8);
          ctx.rotate(side * 0.15);
          
          const hornGrad = ctx.createLinearGradient(0, -size * 0.5, 0, 0);
          hornGrad.addColorStop(0, "#fbbf24");
          hornGrad.addColorStop(1, "#d97706");
          ctx.fillStyle = hornGrad;
          ctx.beginPath();
          ctx.moveTo(-size * 0.1, 0);
          ctx.quadraticCurveTo(-size * 0.25, -size * 0.5, side * size * 0.05, -size * 0.45);
          ctx.quadraticCurveTo(size * 0.05, -size * 0.2, size * 0.1, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // Spikes on the head
        ctx.fillStyle = "#f59e0b";
        [-0.15, 0, 0.15].forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(size * (offset - 0.08), -size * 0.95);
          ctx.lineTo(size * offset, -size * 1.18);
          ctx.lineTo(size * (offset + 0.08), -size * 0.95);
          ctx.closePath();
          ctx.fill();
          
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });

        // Cute reptilian muzzle
        const muzzleGrad = ctx.createRadialGradient(0, size * 0.15, 0, 0, size * 0.25, size * 0.4);
        muzzleGrad.addColorStop(0, "#6ee7b7");
        muzzleGrad.addColorStop(0.7, "#34d399");
        muzzleGrad.addColorStop(1, "#059669");
        ctx.fillStyle = muzzleGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.25, size * 0.45, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nostrils
        ctx.fillStyle = "#064e3b";
        ctx.beginPath();
        ctx.arc(-size * 0.1, size * 0.2, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.1, size * 0.2, size * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Tiny cute dragon wings drawn in background
        ctx.save();
        // Left Wing
        const wingGradL = ctx.createLinearGradient(-size * 0.8, -size * 0.1, -size * 1.5, -size * 0.2);
        wingGradL.addColorStop(0, "#f59e0b");
        wingGradL.addColorStop(1, "#ea580c");
        ctx.fillStyle = wingGradL;
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, -size * 0.1);
        ctx.quadraticCurveTo(-size * 1.4, -size * 0.6, -size * 1.5, -size * 0.2);
        ctx.quadraticCurveTo(-size * 1.2, size * 0.2, -size * 0.8, size * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#9a3412";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Right Wing
        const wingGradR = ctx.createLinearGradient(size * 0.8, -size * 0.1, size * 1.5, -size * 0.2);
        wingGradR.addColorStop(0, "#f59e0b");
        wingGradR.addColorStop(1, "#ea580c");
        ctx.fillStyle = wingGradR;
        ctx.beginPath();
        ctx.moveTo(size * 0.8, -size * 0.1);
        ctx.quadraticCurveTo(size * 1.4, -size * 0.6, size * 1.5, -size * 0.2);
        ctx.quadraticCurveTo(size * 1.2, size * 0.2, size * 0.8, size * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Mouth with a tiny cute fire puff option (always smiling!)
        ctx.strokeStyle = "#064e3b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, size * 0.3, size * 0.15, 0, Math.PI, false);
        ctx.stroke();

        // Cute little fire puff out of mouth
        ctx.save();
        const fireGrad = ctx.createRadialGradient(
          size * 0.1, size * 0.35, size * 0.05,
          size * 0.3, size * 0.45, size * 0.25
        );
        fireGrad.addColorStop(0, "#fef08a"); // bright yellow core
        fireGrad.addColorStop(0.5, "#f97316"); // orange mid
        fireGrad.addColorStop(1, "rgba(239, 68, 68, 0)"); // fading red smoke
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(size * 0.15, size * 0.4, size * 0.1, 0, Math.PI * 2);
        ctx.arc(size * 0.28, size * 0.48, size * 0.15, 0, Math.PI * 2);
        ctx.arc(size * 0.42, size * 0.52, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Rosy Cheeks (radial)
        const cheekGradL = ctx.createRadialGradient(-size * 0.55, size * 0.05, 0, -size * 0.55, size * 0.05, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.6)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.55, size * 0.05, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.55, size * 0.05, 0, size * 0.55, size * 0.05, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.6)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.55, size * 0.05, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Dragon Eyes
        drawStandardEyes(
          ctx,
          size,
          -size * 0.3,
          size * 0.3,
          -size * 0.15,
          size * 0.2,
          size * 0.1,
          eyeMode === "normal" ? "sparkle" : eyeMode,
        );
      };

      const drawPanda = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // Base head with creamy white 3D gradient
        const headGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        headGrad.addColorStop(0, "#ffffff");
        headGrad.addColorStop(0.7, "#fafafa");
        headGrad.addColorStop(1, "#cbd5e1"); // soft slate-gray shadow
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Head highlight (3D shine)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // Black floppy ears (with cute inner pink highlight)
        [-1, 1].forEach((side) => {
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(side * size * 0.8, -size * 0.7, size * 0.32, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fda4af"; // pink inner ear
          ctx.beginPath();
          ctx.arc(side * size * 0.8, -size * 0.7, size * 0.18, 0, Math.PI * 2);
          ctx.fill();
        });

        // Cute panda dark eye patches (angled ellipses)
        ctx.fillStyle = "#0f172a"; // deep charcoal black
        ctx.save();
        ctx.translate(-size * 0.32, -size * 0.1);
        ctx.rotate(-0.15);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.22, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(size * 0.32, -size * 0.1);
        ctx.rotate(0.15);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.22, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Small black nose
        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.2, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Friendly mouth
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-size * 0.08, size * 0.24, size * 0.08, 0, Math.PI, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size * 0.08, size * 0.24, size * 0.08, 0, Math.PI, false);
        ctx.stroke();

        // Glowing cheeks blush (radial)
        const cheekGradL = ctx.createRadialGradient(-size * 0.55, size * 0.15, 0, -size * 0.55, size * 0.15, size * 0.18);
        cheekGradL.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradL.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradL;
        ctx.beginPath();
        ctx.arc(-size * 0.55, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        const cheekGradR = ctx.createRadialGradient(size * 0.55, size * 0.15, 0, size * 0.55, size * 0.15, size * 0.18);
        cheekGradR.addColorStop(0, "rgba(244, 114, 182, 0.65)");
        cheekGradR.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cheekGradR;
        ctx.beginPath();
        ctx.arc(size * 0.55, size * 0.15, size * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Panda Eyes (drawn inside white inside the black patch area with high gloss catchlights!)
        const eyeXOffset = size * 0.32;
        const eyeY = -size * 0.1;
        const eyeRad = size * 0.12;
        const pupilRad = size * 0.06;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.15 * Math.PI, 0.85 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.2, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#090d16";
            ctx.beginPath();
            ctx.arc(ex, eyeY, pupilRad, 0, Math.PI * 2);
            ctx.fill();

            // Multi-point highlights
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - pupilRad * 0.35, eyeY - pupilRad * 0.35, pupilRad * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(ex + pupilRad * 0.4, eyeY + pupilRad * 0.3, pupilRad * 0.18, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Little green bamboo shoot in his mouth!
        ctx.save();
        ctx.translate(size * 0.2, size * 0.35);
        ctx.rotate(0.65);
        ctx.fillStyle = "#22c55e"; // bright bamboo green
        ctx.fillRect(-size * 0.05, -size * 0.4, size * 0.1, size * 0.45);
        // Segments
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-size * 0.05, -size * 0.25);
        ctx.lineTo(size * 0.05, -size * 0.25);
        ctx.moveTo(-size * 0.05, -size * 0.1);
        ctx.lineTo(size * 0.05, -size * 0.1);
        ctx.stroke();
        // Leaves
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.3, size * 0.15, size * 0.05, -0.5, 0, Math.PI * 2);
        ctx.ellipse(size * 0.1, -size * 0.15, size * 0.15, size * 0.05, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const drawPikachu = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Electric sparks background (magical golden star sparks)
        ctx.save();
        ctx.fillStyle = "rgba(253, 224, 71, 0.75)"; // glowing yellow
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + 0.4;
          const dist = size * 1.15;
          const sx = Math.cos(angle) * dist;
          const sy = Math.sin(angle) * dist;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.12);
          ctx.lineTo(size * 0.03, -size * 0.03);
          ctx.lineTo(size * 0.12, 0);
          ctx.lineTo(size * 0.03, size * 0.03);
          ctx.lineTo(0, size * 0.12);
          ctx.lineTo(-size * 0.03, size * 0.03);
          ctx.lineTo(-size * 0.12, 0);
          ctx.lineTo(-size * 0.03, -size * 0.03);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // 2. Lightning Tail (drawn behind body, with rich gradient, 3D golden ridges and outline)
        ctx.save();
        const tailGrad = ctx.createLinearGradient(size * 0.4, size * 0.4, size * 1.5, -size * 0.7);
        tailGrad.addColorStop(0, "#ea580c"); // deep orange-gold base
        tailGrad.addColorStop(0.5, "#eab308"); // golden middle
        tailGrad.addColorStop(1, "#fef08a"); // radiant tip
        ctx.fillStyle = tailGrad;
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(size * 0.4, size * 0.4);
        ctx.lineTo(size * 0.8, size * 0.25);
        ctx.lineTo(size * 0.65, size * 0.0);
        ctx.lineTo(size * 1.1, -size * 0.25);
        ctx.lineTo(size * 0.9, -size * 0.45);
        ctx.lineTo(size * 1.6, -size * 0.75); // sharp tip
        ctx.lineTo(size * 1.25, -size * 0.85);
        ctx.lineTo(size * 0.7, -size * 0.45);
        ctx.lineTo(size * 0.9, -size * 0.15);
        ctx.lineTo(size * 0.45, size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#451a03"; // dark chocolate brown tail base
        ctx.beginPath();
        ctx.moveTo(size * 0.4, size * 0.4);
        ctx.lineTo(size * 0.55, size * 0.3);
        ctx.lineTo(size * 0.48, size * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 3. Base Body/Head (Yellow 3D Gradient with warm golden shadow)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.25,
          -size * 0.25,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#fef9c3"); // bright cream-yellow highlight
        bodyGrad.addColorStop(0.5, "#facc15"); // yellow body
        bodyGrad.addColorStop(0.85, "#ca8a04"); // gold shadow
        bodyGrad.addColorStop(1, "#854d0e"); // warm bronze border
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Body highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // 4. Pointy Ears (Yellow with rich dark slate tips)
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.55, -size * 0.65);
          ctx.rotate(side * 0.35);

          // Ear Base (radial gradient)
          const earGrad = ctx.createLinearGradient(0, 0, 0, -size * 0.7);
          earGrad.addColorStop(0, "#facc15");
          earGrad.addColorStop(1, "#ca8a04");
          ctx.fillStyle = earGrad;
          ctx.beginPath();
          ctx.ellipse(0, -size * 0.4, size * 0.16, size * 0.52, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ear Inner shadow (adds 3D depth)
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.ellipse(side * size * 0.03, -size * 0.3, size * 0.08, size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ear Dark Tip (slanted black area)
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.ellipse(0, -size * 0.68, size * 0.11, size * 0.24, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // 5. Red Cheeks (Glowing 3D cheeks with gloss catchlights!)
        [-1, 1].forEach((side) => {
          const cx = side * size * 0.65;
          const cy = size * 0.15;
          const r = size * 0.2;
          
          const cheekGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          cheekGrad.addColorStop(0, "#f43f5e"); // vibrant rose pink center
          cheekGrad.addColorStop(0.6, "#e11d48"); // ruby red
          cheekGrad.addColorStop(1, "rgba(190, 18, 60, 0)"); // smooth fading edge
          ctx.fillStyle = cheekGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Cheek glossy white highlight for a lovely 3D shiny effect
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
          ctx.fill();
        });

        // 6. Cute small nose
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, size * 0.05, size * 0.045, 0, Math.PI * 2);
        ctx.fill();

        // Nose highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.01, size * 0.03, size * 0.015, 0, Math.PI * 2);
        ctx.fill();

        // 7. Cute cat-like mouth with tongue
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        
        if (eyeMode === "happy" || eyeMode === "excited") {
          // Open smiling mouth with little tongue!
          ctx.save();
          ctx.fillStyle = "#fda4af"; // light pink tongue
          ctx.beginPath();
          ctx.arc(0, size * 0.12, size * 0.12, 0, Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          // Standard wavy mouth
          ctx.beginPath();
          ctx.arc(-size * 0.07, size * 0.1, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(size * 0.07, size * 0.1, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
        }

        // 8. Sparkle Eyes (Kawaii Shiny Eyes with high glass catchlights!)
        const eyeXOffset = size * 0.35;
        const eyeY = -size * 0.15;
        const eyeRad = size * 0.14;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.15, eyeRad * 0.85, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            // Glossy black iris
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Multi-point catchlights for extremely glossy anime style eye
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.3, eyeY - eyeRad * 0.3, eyeRad * 0.42, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.4, eyeY + eyeRad * 0.3, eyeRad * 0.2, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      const drawAxolotl = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Soft Bubbles (drawn in background with beautiful subtle blue/pink sheen)
        ctx.save();
        ctx.lineWidth = 1.8;
        const bubbleCoords = [
          { x: -size * 1.2, y: -size * 0.6, r: size * 0.1 },
          { x: size * 1.3, y: -size * 0.3, r: size * 0.14 },
          { x: -size * 1.0, y: size * 0.5, r: size * 0.08 },
          { x: size * 1.1, y: size * 0.6, r: size * 0.12 }
        ];
        bubbleCoords.forEach(b => {
          const bubGrad = ctx.createRadialGradient(b.x - b.r * 0.2, b.y - b.r * 0.2, 0, b.x, b.y, b.r);
          bubGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
          bubGrad.addColorStop(0.7, "rgba(244, 114, 182, 0.15)");
          bubGrad.addColorStop(1, "rgba(56, 189, 248, 0.4)");
          ctx.strokeStyle = bubGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          
          // Highlight inside bubble
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 2. Six highly detailed external gill frills with feather branches! (Glowing hot-pink/magenta radial gradients)
        [-1, 1].forEach((side) => {
          for (let i = 0; i < 3; i++) {
            ctx.save();
            const baseAngle = side * (0.12 + i * 0.28);
            const gx = side * size * 0.75;
            const gy = -size * 0.15 + i * size * 0.22;
            ctx.translate(gx, gy);
            ctx.rotate(baseAngle);

            // Main stem of the gill (3D gradient)
            const gillStemGrad = ctx.createLinearGradient(0, -size * 0.08, 0, size * 0.08);
            gillStemGrad.addColorStop(0, "#f472b6"); // bright hot pink
            gillStemGrad.addColorStop(0.5, "#db2777"); // deep magenta
            gillStemGrad.addColorStop(1, "#9d174d"); // shadow
            ctx.fillStyle = gillStemGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.32, size * 0.09, 0, 0, Math.PI * 2);
            ctx.fill();

            // Feather branches (3 little frill leaves on top, 3 on bottom)
            [-1, 1].forEach((frillSide) => {
              for (let f = 0; f < 3; f++) {
                const fx = (f - 1) * size * 0.11;
                const fy = frillSide * size * 0.1;
                const r = size * 0.065;
                
                const frillGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
                frillGrad.addColorStop(0, "#fbcfe8");
                frillGrad.addColorStop(0.6, "#ec4899");
                frillGrad.addColorStop(1, "#be185d");
                ctx.fillStyle = frillGrad;
                ctx.beginPath();
                ctx.arc(fx, fy, r, 0, Math.PI * 2);
                ctx.fill();
              }
            });

            ctx.restore();
          }
        });

        // 3. Base shape with soft 3D gradient (gorgeous translucent gummy pink Axolotl)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#fff1f2"); // glowing white center
        bodyGrad.addColorStop(0.5, "#fda4af"); // soft rose pink
        bodyGrad.addColorStop(0.85, "#f43f5e"); // vibrant classic pink
        bodyGrad.addColorStop(1, "#be185d"); // deep border shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.1, size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing golden speckles (gummy look)
        ctx.fillStyle = "rgba(253, 224, 71, 0.45)"; // gold sparkles
        [-size * 0.5, -size * 0.2, size * 0.3, size * 0.6].forEach((sx, idx) => {
          ctx.beginPath();
          ctx.arc(sx, -size * 0.3 + (idx % 2) * size * 0.15, size * 0.035, 0, Math.PI * 2);
          ctx.fill();
        });

        // Soft gloss shine on forehead (3D glass dome reflection)
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.3, size * 0.32, size * 0.16, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // 4. Wide happy open mouth with cute tongue and smile outline
        ctx.strokeStyle = "#831843";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        
        if (eyeMode === "happy" || eyeMode === "excited") {
          // Open smiling mouth with a deep rose-red interior and soft pink tongue!
          ctx.save();
          ctx.fillStyle = "#9f1239"; // dark red throat
          ctx.beginPath();
          ctx.arc(0, size * 0.1, size * 0.14, 0, Math.PI);
          ctx.fill();
          ctx.stroke();

          // Tongue
          ctx.fillStyle = "#fda4af";
          ctx.beginPath();
          ctx.ellipse(0, size * 0.18, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Happy arc smile
          ctx.beginPath();
          ctx.arc(0, size * 0.08, size * 0.18, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
        }

        // Cute blush cheeks (glowing radial)
        [-1, 1].forEach((side) => {
          const cx = side * size * 0.55;
          const cy = size * 0.15;
          const r = size * 0.14;
          const blushGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          blushGrad.addColorStop(0, "rgba(244, 63, 94, 0.7)");
          blushGrad.addColorStop(1, "rgba(244, 63, 94, 0)");
          ctx.fillStyle = blushGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // 5. Highly reflective wide-set baby eyes with multiple catchlights
        const eyeXOffset = size * 0.42;
        const eyeY = -size * 0.08;
        const eyeRad = size * 0.1;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#831843";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.15 * Math.PI, 0.85 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#831843";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.15, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Triple shiny gloss reflections for an extremely cute anime look!
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.28, eyeY - eyeRad * 0.28, eyeRad * 0.42, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.35, eyeY + eyeRad * 0.3, eyeRad * 0.18, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.25, eyeY + eyeRad * 0.35, eyeRad * 0.1, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      const drawCapybara = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Cozy Hot-Spring Steam (background)
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        // Draw 3 soft puffy steam clouds floating up behind the capybara
        [-size * 0.5, 0, size * 0.5].forEach((cloudX, idx) => {
          const cy = -size * 0.9 + (idx % 2) * size * 0.1;
          ctx.beginPath();
          ctx.arc(cloudX, cy, size * 0.15, 0, Math.PI * 2);
          ctx.arc(cloudX - size * 0.08, cy + size * 0.05, size * 0.1, 0, Math.PI * 2);
          ctx.arc(cloudX + size * 0.08, cy + size * 0.05, size * 0.1, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 2. Base fluffy-oval body (multi-layered brown gradient)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.15,
          -size * 0.35,
          size * 0.1,
          0,
          0,
          size * 1.15,
        );
        bodyGrad.addColorStop(0, "#f5e0c3");
        bodyGrad.addColorStop(0.3, "#b45309"); // rich amber brown
        bodyGrad.addColorStop(0.8, "#78350f"); // deep brown
        bodyGrad.addColorStop(1, "#451a03"); // chocolate border
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.roundRect(-size * 0.95, -size * 0.85, size * 1.9, size * 1.75, size * 0.6);
        ctx.fill();

        // 3. Cute high-set ears with pinkish interiors
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.arc(-size * 0.55, -size * 0.92, size * 0.24, 0, Math.PI * 2);
        ctx.arc(size * 0.55, -size * 0.92, size * 0.24, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#fecdd3"; // soft inner ear pink
        ctx.beginPath();
        ctx.arc(-size * 0.55, -size * 0.92, size * 0.14, 0, Math.PI * 2);
        ctx.arc(size * 0.55, -size * 0.92, size * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // 4. Large adorable dark chocolate nose snout
        ctx.fillStyle = "#381a04";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.3, size * 0.55, size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Snout Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, size * 0.2, size * 0.15, size * 0.08, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Y-shape mouth
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, size * 0.12);
        ctx.lineTo(0, size * 0.25);
        ctx.moveTo(-size * 0.14, size * 0.36);
        ctx.bezierCurveTo(-size * 0.05, size * 0.24, size * 0.05, size * 0.24, size * 0.14, size * 0.36);
        ctx.stroke();

        // 5. Chill Zen closed sleepy eyes
        const eyeXOffset = size * 0.42;
        const eyeY = -size * 0.15;
        const eyeRad = size * 0.095;

        if (eyeMode === "dizzy" || eyeMode === "shocked") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#451a03";
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.stroke();
          });
        } else {
          // Classic super peaceful sleepy closed eyes
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#271201";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        }

        // Cute rosy cheeks from being warm in the bath
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.beginPath();
        ctx.arc(-size * 0.65, size * 0.15, size * 0.14, 0, Math.PI * 2);
        ctx.arc(size * 0.65, size * 0.15, size * 0.14, 0, Math.PI * 2);
        ctx.fill();

        // 6. Beautiful 3D Mandarin Orange (Yuzu) with a green leaf and shine
        ctx.save();
        ctx.translate(0, -size * 0.96);
        
        // Orange body (Gradient)
        const orangeGrad = ctx.createRadialGradient(-size * 0.05, -size * 0.05, 0, 0, 0, size * 0.25);
        orangeGrad.addColorStop(0, "#fed7aa");
        orangeGrad.addColorStop(0.5, "#f97316");
        orangeGrad.addColorStop(1, "#ea580c");
        ctx.fillStyle = orangeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // White shine reflection
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(-size * 0.08, -size * 0.08, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Little green leaf & brown stem
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.12);
        ctx.lineTo(size * 0.05, -size * 0.3);
        ctx.stroke();

        ctx.fillStyle = "#22c55e"; // leaf
        ctx.beginPath();
        ctx.ellipse(size * 0.14, -size * 0.28, size * 0.14, size * 0.07, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 7. Onsen Water Bath Ripple (foreground blue pool)
        ctx.save();
        const waterGrad = ctx.createLinearGradient(0, size * 0.65, 0, size * 0.9);
        waterGrad.addColorStop(0, "rgba(56, 189, 248, 0.7)"); // translucent light sky blue
        waterGrad.addColorStop(1, "rgba(14, 165, 233, 0.85)"); // deeper ocean blue
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.roundRect(-size * 1.05, size * 0.65, size * 2.1, size * 0.35, size * 0.25);
        ctx.fill();

        // Faint white water ripple rings
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.78, size * 0.85, size * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };

      const drawShiba = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Base Head (Shiba rich golden/honey-orange gradient)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#fef08a"); // golden highlights
        bodyGrad.addColorStop(0.4, "#f97316"); // warm orange
        bodyGrad.addColorStop(0.85, "#c2410c"); // deep tan
        bodyGrad.addColorStop(1, "#7c2d12"); // chestnut borders
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Soft forehead sheen
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // 2. Shiba cheek squeeze (fluffy white cheeks extending out)
        ctx.fillStyle = "#fffbeb"; // warm cream-white
        ctx.beginPath();
        // Left fluffy cheek
        ctx.ellipse(-size * 0.45, size * 0.25, size * 0.45, size * 0.35, -0.2, 0, Math.PI * 2);
        // Right fluffy cheek
        ctx.ellipse(size * 0.45, size * 0.25, size * 0.45, size * 0.35, 0.2, 0, Math.PI * 2);
        // Center snout area
        ctx.ellipse(0, size * 0.22, size * 0.35, size * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw cute white cheek fluffs (extra fur tufts!)
        ctx.fillStyle = "#fffbeb";
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(side * size * 0.8, size * 0.1);
          ctx.lineTo(side * size * 1.02, size * 0.25);
          ctx.lineTo(side * size * 0.8, size * 0.35);
          ctx.closePath();
          ctx.fill();
        });

        // 3. Pointy alert ears with pinkish inner fur
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.6, -size * 0.65);
          ctx.rotate(side * 0.22);

          // Outer ear
          ctx.fillStyle = "#c2410c";
          ctx.beginPath();
          ctx.moveTo(-size * 0.22, 0);
          ctx.lineTo(0, -size * 0.6);
          ctx.lineTo(size * 0.22, 0);
          ctx.closePath();
          ctx.fill();

          // Inner ear
          ctx.fillStyle = "#ffe4e6"; // cozy pink
          ctx.beginPath();
          ctx.moveTo(-size * 0.12, -size * 0.05);
          ctx.lineTo(0, -size * 0.45);
          ctx.lineTo(size * 0.12, -size * 0.05);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });

        // 4. Iconic white "eyebrow dots"
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath();
        ctx.arc(-size * 0.32, -size * 0.42, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.32, -size * 0.42, size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 5. Little glossy black nose
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.06, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose sheen
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.03, size * 0.04, size * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // 6. Cute smiling mouth with a little pink tongue sticking out ("mlem")
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";

        if (eyeMode === "happy" || eyeMode === "excited") {
          // Open playful dog smile with tongue sticking out!
          ctx.save();
          // Tongue
          ctx.fillStyle = "#fda4af"; // cute pink
          ctx.beginPath();
          ctx.arc(0, size * 0.15, size * 0.12, 0, Math.PI);
          ctx.fill();
          
          // Mouth outline
          ctx.stroke();
          ctx.restore();
        } else {
          // Classic dog smile curves
          ctx.beginPath();
          ctx.arc(-size * 0.08, size * 0.11, size * 0.08, 0, Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(size * 0.08, size * 0.11, size * 0.08, 0, Math.PI, false);
          ctx.stroke();
        }

        // 7. Rosy puppy blush cheeks
        ctx.fillStyle = "rgba(251, 113, 133, 0.45)";
        ctx.beginPath();
        ctx.arc(-size * 0.55, size * 0.2, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.55, size * 0.2, size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 8. Eyes with lovely reflections
        const eyeXOffset = size * 0.32;
        const eyeY = -size * 0.15;
        const eyeRad = size * 0.13;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.15, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Main eye shine
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.25, eyeY - eyeRad * 0.25, eyeRad * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // Extra twinkle reflection
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.35, eyeY + eyeRad * 0.3, eyeRad * 0.18, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 9. Adorable Red Scarf Collar with a Golden Bell (at the bottom)
        ctx.save();
        ctx.translate(0, size * 0.82);

        // Collar Band (Red with golden pattern or simple sleek red)
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.55, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#991b1b";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Gold Bell (circle + collar loop + bell slot)
        const bellRad = size * 0.14;
        const bellY = size * 0.08;
        
        const bellGrad = ctx.createRadialGradient(-size * 0.03, bellY - size * 0.03, 0, 0, bellY, bellRad);
        bellGrad.addColorStop(0, "#fef08a");
        bellGrad.addColorStop(0.6, "#eab308");
        bellGrad.addColorStop(1, "#a16207");
        ctx.fillStyle = bellGrad;

        ctx.beginPath();
        ctx.arc(0, bellY, bellRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bell detail lines (the horizontal line + small bell sound-hole)
        ctx.strokeStyle = "#78350f";
        ctx.beginPath();
        ctx.moveTo(-bellRad * 0.8, bellY);
        ctx.lineTo(bellRad * 0.8, bellY);
        ctx.stroke();

        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.arc(0, bellY + bellRad * 0.35, bellRad * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      const drawTotoro = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Ears (tall grey pointy ears)
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.4, -size * 0.7);
          ctx.rotate(side * 0.1);
          const earGrad = ctx.createLinearGradient(-size * 0.15, 0, size * 0.15, 0);
          earGrad.addColorStop(0, "#94a3b8");
          earGrad.addColorStop(1, "#475569");
          ctx.fillStyle = earGrad;
          ctx.beginPath();
          ctx.moveTo(-size * 0.15, 0);
          ctx.quadraticCurveTo(0, -size * 0.6, size * 0.15, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // 2. Base Body (Big fluffy grey circle/oval)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#cbd5e1"); // light grey-blue highlight
        bodyGrad.addColorStop(0.6, "#64748b"); // slate grey
        bodyGrad.addColorStop(1, "#334155"); // dark slate grey outline
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.05, size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft highlight on top left head
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, -size * 0.4, size * 0.3, size * 0.15, -0.6, 0, Math.PI * 2);
        ctx.fill();

        // 3. Fluffy White Tummy
        ctx.fillStyle = "#f8fafc"; // pure off-white
        ctx.beginPath();
        ctx.ellipse(0, size * 0.25, size * 0.7, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Grey Chevrons (Arrow marks) on Tummy (usually 3 on top row, 4 on bottom row)
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const drawChevron = (cx: number, cy: number, w: number, h: number) => {
          ctx.beginPath();
          ctx.moveTo(cx - w / 2, cy + h);
          ctx.quadraticCurveTo(cx, cy, cx + w / 2, cy + h);
          ctx.stroke();
        };

        // Top Row (3 chevrons)
        drawChevron(-size * 0.3, size * 0.05, size * 0.15, size * 0.08);
        drawChevron(0, size * 0.02, size * 0.15, size * 0.08);
        drawChevron(size * 0.3, size * 0.05, size * 0.15, size * 0.08);

        // Bottom Row (4 chevrons)
        drawChevron(-size * 0.45, size * 0.28, size * 0.15, size * 0.08);
        drawChevron(-size * 0.15, size * 0.24, size * 0.15, size * 0.08);
        drawChevron(size * 0.15, size * 0.24, size * 0.15, size * 0.08);
        drawChevron(size * 0.45, size * 0.28, size * 0.15, size * 0.08);

        // 5. Cute Whiskers (3 on each cheek)
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        [-1, 1].forEach((side) => {
          for (let i = 0; i < 3; i++) {
            const dy = (i - 1) * size * 0.1;
            ctx.beginPath();
            ctx.moveTo(side * size * 0.75, size * 0.05 + dy);
            ctx.lineTo(side * size * 1.15, size * 0.03 + dy * 1.2);
            ctx.stroke();
          }
        });

        // 6. Cute button nose
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.15, size * 0.12, size * 0.065, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7. Small tiny mouth (usually just a little line or wide-open roar if happy/excited)
        if (eyeMode === "happy" || eyeMode === "excited") {
          // Gigantic Totoro toothy roar smile!
          ctx.save();
          ctx.fillStyle = "#f1f5f9"; // light gums/mouth
          ctx.beginPath();
          ctx.ellipse(0, size * 0.02, size * 0.35, size * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Tooth grid lines (Totoro's classic big square teeth)
          ctx.beginPath();
          ctx.moveTo(-size * 0.3, size * 0.02);
          ctx.lineTo(size * 0.3, size * 0.02);
          ctx.stroke();
          for (let i = -2; i <= 2; i++) {
            const tx = i * size * 0.1;
            ctx.beginPath();
            ctx.moveTo(tx, -size * 0.08);
            ctx.lineTo(tx, size * 0.12);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // Totoro's tiny cute straight line mouth
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-size * 0.08, 0);
          ctx.lineTo(size * 0.08, 0);
          ctx.stroke();
        }

        // 8. Eyes (Totoro's classic blank-staring wide-set round eyes)
        const eyeXOffset = size * 0.38;
        const eyeY = -size * 0.18;
        const eyeRad = size * 0.14;

        [-1, 1].forEach((side) => {
          const ex = side * eyeXOffset;
          // White of the eye
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Totoro's tiny black pupil (staring look)
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          if (eyeMode === "happy" || eyeMode === "excited") {
            // Little curved happy pupil
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.arc(ex, eyeY, eyeRad * 0.4, Math.PI, 0, false);
            ctx.stroke();
          } else if (eyeMode === "sleepy") {
            // Sleeping eyes
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          } else {
            // Default tiny round pupil centered or slightly crossed for cuteness
            ctx.arc(ex - side * size * 0.02, eyeY, size * 0.045, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 9. Green Leaf on Head (Iconic Ghibli accessory!)
        ctx.save();
        ctx.translate(0, -size * 0.92);
        const leafGrad = ctx.createLinearGradient(-size * 0.15, -size * 0.1, size * 0.15, size * 0.1);
        leafGrad.addColorStop(0, "#4ade80"); // vibrant green
        leafGrad.addColorStop(1, "#15803d"); // dark forest green
        ctx.fillStyle = leafGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.28, size * 0.11, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#166534";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Leaf stem
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, 0);
        ctx.quadraticCurveTo(-size * 0.3, -size * 0.08, -size * 0.35, -size * 0.05);
        ctx.stroke();
        ctx.restore();
      };

      const drawChopper = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Antlers (behind hat)
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.58, -size * 0.5);
          ctx.rotate(side * 0.35);

          // Antler main stem
          ctx.fillStyle = "#854d0e"; // warm brown antler
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.12, size * 0.45, 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Antler tines/branches
          ctx.beginPath();
          ctx.ellipse(-side * size * 0.1, -size * 0.25, size * 0.08, size * 0.2, -0.4, 0, Math.PI * 2);
          ctx.ellipse(side * size * 0.08, -size * 0.1, size * 0.07, size * 0.16, 0.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // 2. Base Reindeer Head/Body (furry warm brown)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.2,
          -size * 0.2,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#f97316"); // warm orange-tan Highlight
        bodyGrad.addColorStop(0.7, "#ca8a04"); // reindeer tan-brown
        bodyGrad.addColorStop(1, "#854d0e"); // dark shadow borders
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.02, size * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Cute wide-fluffy white face patches (around mouth and cheeks)
        ctx.fillStyle = "#fffbeb"; // warm cream white
        ctx.beginPath();
        ctx.ellipse(-size * 0.32, size * 0.2, size * 0.38, size * 0.32, -0.15, 0, Math.PI * 2);
        ctx.ellipse(size * 0.32, size * 0.2, size * 0.38, size * 0.32, 0.15, 0, Math.PI * 2);
        ctx.ellipse(0, size * 0.25, size * 0.35, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Chopper's Big Iconic Pink Top Hat (Hat drawn on top of forehead)
        ctx.save();
        ctx.translate(0, -size * 0.6);

        // Hat Brim (wide magenta-pink ellipse)
        ctx.fillStyle = "#ec4899"; // intense rosy pink
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.15, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#9d174d";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Hat Crown (tall rosy pink top hat cylinder)
        const crownGrad = ctx.createLinearGradient(-size * 0.6, 0, size * 0.6, 0);
        crownGrad.addColorStop(0, "#db2777");
        crownGrad.addColorStop(0.5, "#f472b6");
        crownGrad.addColorStop(1, "#9d174d");
        ctx.fillStyle = crownGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.72, -size * 0.05);
        ctx.lineTo(-size * 0.65, -size * 0.85);
        ctx.quadraticCurveTo(0, -size * 0.98, size * 0.65, -size * 0.85);
        ctx.lineTo(size * 0.72, -size * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // White Cross on Hat (Chopper's iconic medical/pirate flag cross symbol)
        ctx.fillStyle = "#ffffff";
        ctx.save();
        ctx.translate(0, -size * 0.45);
        // Horizontal bar
        ctx.beginPath();
        ctx.roundRect(-size * 0.26, -size * 0.075, size * 0.52, size * 0.15, 4);
        ctx.fill();
        // Vertical bar
        ctx.beginPath();
        ctx.roundRect(-size * 0.075, -size * 0.26, size * 0.15, size * 0.52, 4);
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // 5. Chopper's Signature Blue Button Nose! (Extremely cute shiny light blue/teal)
        const noseGrad = ctx.createRadialGradient(-size * 0.03, size * 0.04, 0, 0, size * 0.07, size * 0.12);
        noseGrad.addColorStop(0, "#38bdf8"); // glowing sky blue
        noseGrad.addColorStop(0.7, "#0284c7"); // deep ocean blue
        noseGrad.addColorStop(1, "#0369a1"); // dark border
        ctx.fillStyle = noseGrad;
        ctx.beginPath();
        ctx.arc(0, size * 0.07, size * 0.105, 0, Math.PI * 2);
        ctx.fill();

        // Nose shine
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.03, size * 0.04, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // 6. Sweet smile or wide happy mouth
        ctx.strokeStyle = "#854d0e";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";

        if (eyeMode === "happy" || eyeMode === "excited") {
          // Playful open mouth with cute tongue
          ctx.save();
          ctx.fillStyle = "#f43f5e"; // soft pink mouth
          ctx.beginPath();
          ctx.ellipse(0, size * 0.22, size * 0.14, size * 0.1, 0, 0, Math.PI);
          ctx.fill();
          ctx.restore();
          
          ctx.beginPath();
          ctx.arc(0, size * 0.15, size * 0.12, 0, Math.PI, false);
          ctx.stroke();
        } else {
          // Double cute cat-like smile
          ctx.beginPath();
          ctx.arc(-size * 0.07, size * 0.14, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(size * 0.07, size * 0.14, size * 0.07, 0, Math.PI, false);
          ctx.stroke();
        }

        // Cute rosy blush
        ctx.fillStyle = "rgba(244, 63, 94, 0.45)";
        ctx.beginPath();
        ctx.arc(-size * 0.5, size * 0.18, size * 0.1, 0, Math.PI * 2);
        ctx.arc(size * 0.5, size * 0.18, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 7. Shiny big deer eyes
        const eyeXOffset = size * 0.35;
        const eyeY = -size * 0.14;
        const eyeRad = size * 0.13;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#451a03";
            ctx.lineWidth = 3.8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#451a03";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.15, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Large shiny anime catchlights
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.28, eyeY - eyeRad * 0.28, eyeRad * 0.42, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.35, eyeY + eyeRad * 0.3, eyeRad * 0.18, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      const drawAppa = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Curved horns (on sides, curving inwards)
        [-1, 1].forEach((side) => {
          ctx.save();
          ctx.translate(side * size * 0.72, -size * 0.45);
          ctx.rotate(-side * 0.4);
          
          ctx.fillStyle = "#475569"; // slate dark grey horns
          ctx.beginPath();
          // Arc/curve pointing inward
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(side * size * 0.1, -size * 0.4, side * size * 0.3, -size * 0.3, side * size * 0.15, -size * 0.1);
          ctx.bezierCurveTo(side * size * 0.2, -size * 0.25, side * size * 0.05, -size * 0.3, 0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // 2. Base Big Fluffy Bison Head (wide oval, off-white/cream)
        const bodyGrad = ctx.createRadialGradient(
          -size * 0.1,
          -size * 0.1,
          size * 0.1,
          0,
          0,
          size,
        );
        bodyGrad.addColorStop(0, "#ffffff"); // glowing white center
        bodyGrad.addColorStop(0.7, "#f1f5f9"); // clean soft white
        bodyGrad.addColorStop(1, "#cbd5e1"); // soft shadow border
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.15, size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Appa's Iconic Dark Arrow Mark (pointing down towards snout)
        ctx.fillStyle = "#475569"; // Bison dark brown/slate arrow
        ctx.beginPath();
        ctx.moveTo(0, size * 0.05); // Tip of the arrow
        ctx.lineTo(-size * 0.3, -size * 0.75); // Left corner
        ctx.lineTo(-size * 0.12, -size * 0.75); // Left inner step
        ctx.lineTo(-size * 0.12, -size * 0.9); // Left top
        ctx.lineTo(size * 0.12, -size * 0.9); // Right top
        ctx.lineTo(size * 0.12, -size * 0.75); // Right inner step
        ctx.lineTo(size * 0.3, -size * 0.75); // Right corner
        ctx.closePath();
        ctx.fill();

        // 4. Large wide gray bison snout/mouth area (at the bottom)
        ctx.fillStyle = "#e2e8f0"; // slate snout base
        ctx.beginPath();
        ctx.ellipse(0, size * 0.28, size * 0.58, size * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Big dark gray/black snout nose
        ctx.fillStyle = "#334155"; // deep gray
        ctx.beginPath();
        ctx.roundRect(-size * 0.18, size * 0.1, size * 0.36, size * 0.18, 12);
        ctx.fill();

        // Nose highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.ellipse(-size * 0.05, size * 0.13, size * 0.06, size * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6. Friendly mouth
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";

        if (eyeMode === "happy" || eyeMode === "excited") {
          // Open "yip yip" mouth!
          ctx.save();
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(0, size * 0.32, size * 0.12, 0, Math.PI, false);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          // Happy line smile
          ctx.beginPath();
          ctx.arc(0, size * 0.28, size * 0.18, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
        }

        // 7. Bison cheeks
        ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
        ctx.beginPath();
        ctx.arc(-size * 0.65, size * 0.18, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.65, size * 0.18, size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // 8. Gentle Friendly Bison Eyes
        const eyeXOffset = size * 0.38;
        const eyeY = -size * 0.12;
        const eyeRad = size * 0.11;

        if (eyeMode === "sleepy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
          });
        } else if (eyeMode === "happy") {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.15, eyeRad * 0.8, Math.PI, 0, false);
            ctx.stroke();
          });
        } else {
          [-1, 1].forEach((side) => {
            const ex = side * eyeXOffset;
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Nice gentle highlights
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ex - eyeRad * 0.25, eyeY - eyeRad * 0.25, eyeRad * 0.38, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.32, eyeY + eyeRad * 0.28, eyeRad * 0.16, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      const drawGrogu = (
        ctx: CanvasRenderingContext2D,
        size: number,
        eyeMode: string,
      ) => {
        // 1. Huge Ears (iconic long pointy ears sticking out sideways and slightly downwards)
        [-1, 1].forEach((side) => {
          ctx.save();
          // Position ears at side of head
          ctx.translate(side * size * 0.55, -size * 0.15);
          ctx.rotate(side * 0.18);

          // Outer Ear (sage green)
          const earGrad = ctx.createLinearGradient(0, -size * 0.15, side * size * 0.85, size * 0.1);
          earGrad.addColorStop(0, "#86efac"); // light sage green
          earGrad.addColorStop(0.5, "#4ade80");
          earGrad.addColorStop(1, "#15803d"); // dark edge
          ctx.fillStyle = earGrad;
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.18);
          // Curve out to a sharp tip
          ctx.quadraticCurveTo(side * size * 0.5, -size * 0.28, side * size * 0.85, -size * 0.05);
          // Curve back to the head
          ctx.quadraticCurveTo(side * size * 0.4, size * 0.18, 0, size * 0.12);
          ctx.closePath();
          ctx.fill();

          // Inner Ear (cute baby pink)
          ctx.fillStyle = "#fecdd3"; // soft pink/rose
          ctx.beginPath();
          ctx.moveTo(side * size * 0.1, -size * 0.12);
          ctx.quadraticCurveTo(side * size * 0.45, -size * 0.18, side * size * 0.72, -size * 0.06);
          ctx.quadraticCurveTo(side * size * 0.35, size * 0.08, side * size * 0.1, size * 0.06);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });

        // 2. Robe Body (Sand-beige/tan coat)
        const robeGrad = ctx.createLinearGradient(0, size * 0.1, 0, size * 0.95);
        robeGrad.addColorStop(0, "#fef08a"); // warm light tan highlight
        robeGrad.addColorStop(0.6, "#eab308"); // golden tan
        robeGrad.addColorStop(1, "#a16207"); // deep brown shadows at the floor
        ctx.fillStyle = robeGrad;
        ctx.beginPath();
        // A bulky bell-shaped robe body
        ctx.moveTo(-size * 0.65, size * 0.95);
        ctx.bezierCurveTo(-size * 0.75, size * 0.4, -size * 0.45, size * 0.15, 0, size * 0.15);
        ctx.bezierCurveTo(size * 0.45, size * 0.15, size * 0.75, size * 0.4, size * 0.65, size * 0.95);
        ctx.closePath();
        ctx.fill();

        // 3. Fluffy Beige Furry Collar (The chunky neck ring of Grogu's coat)
        const collarGrad = ctx.createLinearGradient(-size * 0.6, 0, size * 0.6, 0);
        collarGrad.addColorStop(0, "#d97706"); // warm darker amber
        collarGrad.addColorStop(0.5, "#fef08a"); // bright warm cream
        collarGrad.addColorStop(1, "#b45309");
        ctx.fillStyle = collarGrad;
        ctx.beginPath();
        ctx.roundRect(-size * 0.62, -size * 0.08, size * 1.24, size * 0.28, 15);
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Collar wrinkles
        ctx.strokeStyle = "rgba(120, 53, 15, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.05);
        ctx.lineTo(-size * 0.1, size * 0.15);
        ctx.moveTo(size * 0.3, size * 0.05);
        ctx.lineTo(size * 0.1, size * 0.15);
        ctx.stroke();

        // 4. Head (cute wide rounded oval, light sage green)
        ctx.save();
        ctx.translate(0, -size * 0.22);
        const headGrad = ctx.createRadialGradient(-size * 0.15, -size * 0.15, 0, 0, 0, size * 0.7);
        headGrad.addColorStop(0, "#dcfce7"); // ultra-light highlight
        headGrad.addColorStop(0.4, "#86efac"); // soft sage-green
        headGrad.addColorStop(1, "#166534"); // deep shadow
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.68, size * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle head wrinkles (classic wise master wrinkles on forehead)
        ctx.strokeStyle = "rgba(22, 101, 52, 0.45)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        // Top wrinkle
        ctx.arc(0, -size * 0.22, size * 0.25, 1.2 * Math.PI, 1.8 * Math.PI, false);
        ctx.stroke();
        ctx.beginPath();
        // Lower wrinkle
        ctx.arc(0, -size * 0.14, size * 0.18, 1.2 * Math.PI, 1.8 * Math.PI, false);
        ctx.stroke();

        // Cute tiny button nose
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.05, size * 0.06, size * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Cute little alien mouth
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        if (eyeMode === "happy" || eyeMode === "excited") {
          // Sweet tiny smiley mouth
          ctx.beginPath();
          ctx.arc(0, size * 0.12, size * 0.08, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
        } else {
          // Tiny neutral/slightly curved line
          ctx.beginPath();
          ctx.moveTo(-size * 0.06, size * 0.14);
          ctx.quadraticCurveTo(0, size * 0.16, size * 0.06, size * 0.14);
          ctx.stroke();
        }

        // 6. Huge, deep black/glassy adorable eyes
        const eyeXOffset = size * 0.25;
        const eyeY = -size * 0.03;
        const eyeRad = size * 0.135;

        [-1, 1].forEach((side) => {
          const ex = side * eyeXOffset;
          ctx.save();
          
          // Eyelids/socket shading
          ctx.fillStyle = "rgba(22, 101, 52, 0.25)";
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeRad * 1.3, 0, Math.PI * 2);
          ctx.fill();

          if (eyeMode === "sleepy") {
            // Half-closed eyelids
            ctx.fillStyle = "#86efac";
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI, true);
            ctx.fill();
            ctx.strokeStyle = "#14532d";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI, false);
            ctx.stroke();
          } else if (eyeMode === "happy") {
            // Happy closed curves
            ctx.strokeStyle = "#14532d";
            ctx.lineWidth = 4.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(ex, eyeY + eyeRad * 0.2, eyeRad * 0.85, Math.PI, 0, false);
            ctx.stroke();
          } else {
            // Classic huge black master eyes
            ctx.fillStyle = "#0f172a"; // dark slate black
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeRad, 0, Math.PI * 2);
            ctx.fill();

            // Shiny catchlights (large anime star/bubble glow)
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            // Main highlight
            ctx.arc(ex - eyeRad * 0.3, eyeY - eyeRad * 0.3, eyeRad * 0.45, 0, Math.PI * 2);
            ctx.fill();
            
            // Secondary cute reflection below
            ctx.beginPath();
            ctx.arc(ex + eyeRad * 0.35, eyeY + eyeRad * 0.3, eyeRad * 0.18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        ctx.restore(); // end head translate

        // 7. Interactive Features (Soup cup or floating leaves via the Force)
        const time = Date.now() * 0.003;
        const floatOffset = Math.sin(time) * 4;

        if (eyeMode === "happy" || eyeMode === "excited") {
          // THE FORCE animation: Grogu raises his little hand, and leaves/sparks float above!
          // Little green hand raising
          ctx.save();
          ctx.translate(size * 0.35, size * 0.28);
          ctx.rotate(-0.5);
          // Hand
          ctx.fillStyle = "#86efac";
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.09, size * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          // Fingers (3 tiny cute points)
          ctx.beginPath();
          ctx.moveTo(-size * 0.03, -size * 0.05);
          ctx.lineTo(-size * 0.05, -size * 0.12);
          ctx.lineTo(0, -size * 0.06);
          ctx.lineTo(size * 0.04, -size * 0.12);
          ctx.lineTo(0, 0);
          ctx.fillStyle = "#4ade80";
          ctx.fill();
          ctx.restore();

          // Floating leaves & magical green force circles
          ctx.save();
          ctx.translate(size * 0.48, -size * 0.35 + floatOffset);
          
          // Glowing force ring
          ctx.strokeStyle = "rgba(74, 222, 128, 0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
          ctx.stroke();

          // Sparkles
          ctx.fillStyle = "#86efac";
          ctx.beginPath();
          ctx.arc(-size * 0.15, -size * 0.1, 3, 0, Math.PI * 2);
          ctx.arc(size * 0.12, size * 0.15, 2, 0, Math.PI * 2);
          ctx.fill();

          // Floating green leaf
          ctx.fillStyle = "#4ade80";
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.12, size * 0.06, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#15803d";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        } else {
          // SOUP CUP animation: Grogu holds a little brown cup of hot soup at his tummy
          ctx.save();
          ctx.translate(0, size * 0.38 + floatOffset * 0.3);

          // Tiny hands holding the cup
          [-1, 1].forEach((side) => {
            ctx.fillStyle = "#86efac";
            ctx.beginPath();
            ctx.ellipse(side * size * 0.22, size * 0.05, size * 0.07, size * 0.05, side * 0.3, 0, Math.PI * 2);
            ctx.fill();
          });

          // Cup Body (warm clay brown)
          const cupGrad = ctx.createLinearGradient(-size * 0.2, 0, size * 0.2, 0);
          cupGrad.addColorStop(0, "#b45309");
          cupGrad.addColorStop(0.5, "#d97706");
          cupGrad.addColorStop(1, "#78350f");
          ctx.fillStyle = cupGrad;
          ctx.beginPath();
          ctx.roundRect(-size * 0.18, 0, size * 0.36, size * 0.18, 6);
          ctx.fill();
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Hot soup inside
          ctx.fillStyle = "#eab308"; // yummy yellow broth
          ctx.beginPath();
          ctx.ellipse(0, 2, size * 0.15, size * 0.03, 0, 0, Math.PI * 2);
          ctx.fill();

          // Steam waves rising up
          ctx.strokeStyle = "rgba(254, 240, 138, 0.65)"; // yellow/cream steam
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          for (let i = -1; i <= 1; i++) {
            const sx = i * size * 0.08;
            const waveY = -size * 0.06 + Math.sin(time + i * 2) * 3;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.bezierCurveTo(sx + 3 * i, -size * 0.05, sx - 3 * i, -size * 0.08, sx, waveY);
            ctx.stroke();
          }

          ctx.restore();
        }
      };

      const drawSnoopy = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.52, size * 0.5, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail (drawn first so it's behind body)
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(-size * 0.45, size * 0.1, size * 0.08, size * 0.2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Body (subtle white-to-gray gradient for rich texture)
        const bodyGrad = ctx.createLinearGradient(-size * 0.35, -size * 0.35, size * 0.35, size * 0.55);
        bodyGrad.addColorStop(0, "#ffffff");
        bodyGrad.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.1, size * 0.35, size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spot on back
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(-size * 0.2, size * 0.1, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Collar (beautiful glossy gradient)
        const collarGrad = ctx.createLinearGradient(-size * 0.3, -size * 0.25, size * 0.3, -size * 0.16);
        collarGrad.addColorStop(0, "#ef4444");
        collarGrad.addColorStop(0.5, "#ff8787");
        collarGrad.addColorStop(1, "#b91c1c");
        ctx.fillStyle = collarGrad;
        ctx.beginPath();
        ctx.roundRect(-size * 0.3, -size * 0.25, size * 0.6, size * 0.09, size * 0.03);
        ctx.fill();
        ctx.stroke();

        // Golden Tag
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(size * 0.05, -size * 0.14, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner highlight for tag
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath();
        ctx.arc(size * 0.035, -size * 0.155, size * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // Head & Snout (Snoopy has a very specific shape - head and snout merge)
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.55, size * 0.35, size * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Snout
        ctx.beginPath();
        ctx.ellipse(size * 0.18, -size * 0.45, size * 0.38, size * 0.22, Math.PI / 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Overlap clean up: re-draw snout fill without stroke first, then stroke
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.55, size * 0.33, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(size * 0.18, -size * 0.45, size * 0.36, size * 0.2, Math.PI / 16, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(size * 0.52, -size * 0.52, size * 0.11, size * 0.07, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        // Nose reflection
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.ellipse(size * 0.49, -size * 0.54, size * 0.04, size * 0.02, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        // Ear (Snoopy's floppy ear hangs down)
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(-size * 0.22, -size * 0.4, size * 0.14, size * 0.3, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = "#1e293b";
        if (eyeMode === "sleepy") {
          ctx.beginPath();
          ctx.arc(size * 0.1, -size * 0.58, size * 0.08, Math.PI, 0, false);
          ctx.stroke();
        } else if (eyeMode === "happy") {
          ctx.beginPath();
          ctx.arc(size * 0.1, -size * 0.54, size * 0.08, 0, Math.PI, true);
          ctx.stroke();
        } else {
          // Normal vertical oval eye
          ctx.beginPath();
          ctx.ellipse(size * 0.1, -size * 0.58, size * 0.03, size * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();
          // eyebrow
          ctx.beginPath();
          ctx.moveTo(size * 0.05, -size * 0.69);
          ctx.quadraticCurveTo(size * 0.1, -size * 0.73, size * 0.18, -size * 0.68);
          ctx.stroke();
        }

        // Smile line
        ctx.beginPath();
        ctx.arc(size * 0.15, -size * 0.4, size * 0.08, 0, Math.PI * 0.7, false);
        ctx.stroke();

        ctx.restore();
      };

      const drawGarfield = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2.5, size * 0.04);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.75, size * 0.75, size * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body Gradient (Rich orange to deep orange shading)
        const bodyGrad = ctx.createRadialGradient(0, size * 0.1, size * 0.1, 0, size * 0.1, size * 0.7);
        bodyGrad.addColorStop(0, "#fb923c");
        bodyGrad.addColorStop(1, "#ea580c");

        // Body
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.22, size * 0.65, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Fat Garfield tail
        ctx.beginPath();
        ctx.ellipse(-size * 0.6, size * 0.4, size * 0.12, size * 0.3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tail tip stripes
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(-size * 0.68, size * 0.48, size * 0.08, size * 0.1, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Stripes on body (filled custom polygons for authentic stripe look instead of thin lines)
        ctx.fillStyle = "#1e293b";
        // Left stripe 1
        ctx.beginPath();
        ctx.moveTo(-size * 0.65, size * 0.15);
        ctx.lineTo(-size * 0.4, size * 0.2);
        ctx.lineTo(-size * 0.65, size * 0.25);
        ctx.closePath();
        ctx.fill();
        // Left stripe 2
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, size * 0.32);
        ctx.lineTo(-size * 0.35, size * 0.35);
        ctx.lineTo(-size * 0.58, size * 0.42);
        ctx.closePath();
        ctx.fill();
        // Right stripe 1
        ctx.beginPath();
        ctx.moveTo(size * 0.65, size * 0.15);
        ctx.lineTo(size * 0.4, size * 0.2);
        ctx.lineTo(size * 0.65, size * 0.25);
        ctx.closePath();
        ctx.fill();
        // Right stripe 2
        ctx.beginPath();
        ctx.moveTo(size * 0.6, size * 0.32);
        ctx.lineTo(size * 0.35, size * 0.35);
        ctx.lineTo(size * 0.58, size * 0.42);
        ctx.closePath();
        ctx.fill();

        // Ears with pink inner ear
        ctx.fillStyle = bodyGrad;
        // Left ear
        ctx.beginPath();
        ctx.moveTo(-size * 0.45, -size * 0.4);
        ctx.quadraticCurveTo(-size * 0.5, -size * 0.85, -size * 0.25, -size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Left inner ear (pink)
        ctx.fillStyle = "#fecdd3";
        ctx.beginPath();
        ctx.moveTo(-size * 0.41, -size * 0.45);
        ctx.quadraticCurveTo(-size * 0.45, -size * 0.75, -size * 0.28, -size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Right ear
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(size * 0.45, -size * 0.4);
        ctx.quadraticCurveTo(size * 0.5, -size * 0.85, size * 0.25, -size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right inner ear (pink)
        ctx.fillStyle = "#fecdd3";
        ctx.beginPath();
        ctx.moveTo(size * 0.41, -size * 0.45);
        ctx.quadraticCurveTo(size * 0.45, -size * 0.75, size * 0.28, -size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.2, size * 0.55, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cheek stripes (Garfield classic cheek stripes)
        ctx.fillStyle = "#1e293b";
        // Left cheek stripes
        ctx.beginPath();
        ctx.moveTo(-size * 0.55, -size * 0.2); ctx.lineTo(-size * 0.4, -size * 0.18); ctx.lineTo(-size * 0.52, -size * 0.14); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-size * 0.52, -size * 0.1); ctx.lineTo(-size * 0.38, -size * 0.09); ctx.lineTo(-size * 0.5, -size * 0.05); ctx.fill();
        // Right cheek stripes
        ctx.beginPath();
        ctx.moveTo(size * 0.55, -size * 0.2); ctx.lineTo(size * 0.4, -size * 0.18); ctx.lineTo(size * 0.52, -size * 0.14); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.52, -size * 0.1); ctx.lineTo(size * 0.38, -size * 0.09); ctx.lineTo(size * 0.5, -size * 0.05); ctx.fill();

        // Garfield's eyes are HUGE, yellow, and touch each other
        ctx.fillStyle = "#fef08a"; // Pale yellow eyes
        ctx.beginPath();
        ctx.ellipse(-size * 0.16, -size * 0.22, size * 0.17, size * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.16, -size * 0.22, size * 0.17, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sleepy Eyelids (heavy orange eyelids)
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(-size * 0.16, -size * 0.22, size * 0.17, size * 0.22, 0, Math.PI, 0, false);
        ctx.ellipse(size * 0.16, -size * 0.22, size * 0.17, size * 0.22, 0, Math.PI, 0, false);
        ctx.fill();
        ctx.stroke();

        // Eyelid separating line
        ctx.beginPath();
        ctx.moveTo(-size * 0.33, -size * 0.22);
        ctx.lineTo(size * 0.33, -size * 0.22);
        ctx.stroke();

        // Pupils
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        if (eyeMode === "sleepy") {
          ctx.ellipse(-size * 0.12, -size * 0.15, size * 0.03, size * 0.04, 0, 0, Math.PI * 2);
          ctx.ellipse(size * 0.12, -size * 0.15, size * 0.03, size * 0.04, 0, 0, Math.PI * 2);
        } else {
          ctx.ellipse(-size * 0.12, -size * 0.12, size * 0.04, size * 0.06, 0, 0, Math.PI * 2);
          ctx.ellipse(size * 0.12, -size * 0.12, size * 0.04, size * 0.06, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // Cheeks / Muzzle (Garfield has large rounded snout cheeks)
        ctx.fillStyle = "#ffedd5"; // light peach cheeks
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, -size * 0.05, size * 0.18, size * 0.13, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.15, -size * 0.05, size * 0.18, size * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nose (oval pink nose sitting exactly in the middle on top of the cheeks)
        ctx.fillStyle = "#f43f5e"; // bright pink
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.08, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Smile line and freckles
        ctx.beginPath();
        ctx.arc(0, -size * 0.05, size * 0.15, 0.1 * Math.PI, 0.9 * Math.PI, false);
        ctx.stroke();

        // Freckle dots on cheeks
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-size * 0.18, -size * 0.04, 2, 0, Math.PI * 2);
        ctx.arc(-size * 0.14, -size * 0.06, 2, 0, Math.PI * 2);
        ctx.arc(-size * 0.2, -size * 0.08, 2, 0, Math.PI * 2);
        ctx.arc(size * 0.18, -size * 0.04, 2, 0, Math.PI * 2);
        ctx.arc(size * 0.14, -size * 0.06, 2, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.08, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      const drawSpongebob = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.03);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.72, size * 0.65, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sponge Body (wavy outline)
        const left = -size * 0.65;
        const right = size * 0.65;
        const top = -size * 0.8;
        const bottom = size * 0.15;

        ctx.fillStyle = "#fde047"; // Beautiful bright sponge yellow
        ctx.beginPath();
        
        // Draw wavy top edge
        ctx.moveTo(left, top);
        for (let x = left; x <= right; x += size * 0.15) {
          ctx.quadraticCurveTo(x + size * 0.075, top - size * 0.03, Math.min(x + size * 0.15, right), top);
        }
        // Draw wavy right edge
        for (let y = top; y <= bottom; y += size * 0.15) {
          ctx.quadraticCurveTo(right + size * 0.03, y + size * 0.075, right, Math.min(y + size * 0.15, bottom));
        }
        // Draw wavy bottom edge
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        // Draw wavy left edge
        for (let y = bottom; y >= top; y -= size * 0.15) {
          ctx.quadraticCurveTo(left - size * 0.03, y - size * 0.075, left, Math.max(y - size * 0.15, top));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sponge Pores (greenish circles)
        ctx.fillStyle = "#eab308";
        const drawPore = (px: number, py: number, r: number) => {
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        };
        drawPore(-size * 0.45, -size * 0.6, size * 0.09);
        drawPore(size * 0.45, -size * 0.5, size * 0.12);
        drawPore(-size * 0.35, -size * 0.1, size * 0.07);
        drawPore(size * 0.35, -size * 0.1, size * 0.08);
        drawPore(size * 0.15, -size * 0.65, size * 0.06);

        // Clothes: White Shirt
        const pantsTop = size * 0.38;
        const clothesBottom = size * 0.6;
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.rect(left + size * 0.05, bottom, (right - left) - size * 0.1, pantsTop - bottom);
        ctx.fill();
        ctx.stroke();

        // Brown Pants
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.rect(left + size * 0.05, pantsTop, (right - left) - size * 0.1, clothesBottom - pantsTop);
        ctx.fill();
        ctx.stroke();

        // Belt Loops (small black rectangles)
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-size * 0.4, pantsTop + size * 0.03, size * 0.1, size * 0.04);
        ctx.fillRect(-size * 0.1, pantsTop + size * 0.03, size * 0.1, size * 0.04);
        ctx.fillRect(size * 0.2, pantsTop + size * 0.03, size * 0.1, size * 0.04);

        // Red Tie and Collar triangles
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, bottom);
        ctx.lineTo(-size * 0.05, pantsTop);
        ctx.lineTo(-size * 0.02, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size * 0.2, bottom);
        ctx.lineTo(size * 0.05, pantsTop);
        ctx.lineTo(size * 0.02, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Red Tie
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(-size * 0.05, bottom + size * 0.05);
        ctx.lineTo(size * 0.05, bottom + size * 0.05);
        ctx.lineTo(size * 0.08, bottom + size * 0.22);
        ctx.lineTo(0, bottom + size * 0.32);
        ctx.lineTo(-size * 0.08, bottom + size * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Big blue Spongebob Eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.24, -size * 0.35, size * 0.22, 0, Math.PI * 2);
        ctx.arc(size * 0.24, -size * 0.35, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Blue Iris
        ctx.fillStyle = "#06b6d4";
        ctx.beginPath();
        ctx.arc(-size * 0.21, -size * 0.35, size * 0.1, 0, Math.PI * 2);
        ctx.arc(size * 0.21, -size * 0.35, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-size * 0.21, -size * 0.35, size * 0.05, 0, Math.PI * 2);
        ctx.arc(size * 0.21, -size * 0.35, size * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Eye glints
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.23, -size * 0.37, size * 0.02, 0, Math.PI * 2);
        ctx.arc(size * 0.19, -size * 0.37, size * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // Eyelashes
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, -size * 0.55); ctx.lineTo(-size * 0.42, -size * 0.65);
        ctx.moveTo(-size * 0.24, -size * 0.58); ctx.lineTo(-size * 0.24, -size * 0.7);
        ctx.moveTo(-size * 0.13, -size * 0.55); ctx.lineTo(-size * 0.08, -size * 0.65);
        ctx.moveTo(size * 0.13, -size * 0.55); ctx.lineTo(size * 0.08, -size * 0.65);
        ctx.moveTo(size * 0.24, -size * 0.58); ctx.lineTo(size * 0.24, -size * 0.7);
        ctx.moveTo(size * 0.35, -size * 0.55); ctx.lineTo(size * 0.42, -size * 0.65);
        ctx.stroke();

        // Spongebob Nose
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.03);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.24, size * 0.08, size * 0.14, Math.PI / 12, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.fill();
        ctx.stroke();

        // Cheeks
        ctx.fillStyle = "#fca5a5";
        ctx.beginPath();
        ctx.ellipse(-size * 0.42, -size * 0.16, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.42, -size * 0.16, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ea580c";
        ctx.beginPath();
        ctx.arc(-size * 0.42, -size * 0.16, size * 0.09, Math.PI, 0, false);
        ctx.arc(size * 0.42, -size * 0.16, size * 0.09, Math.PI, 0, false);
        ctx.stroke();

        // Cheek freckles
        ctx.fillStyle = "#ea580c";
        ctx.beginPath();
        ctx.arc(-size * 0.44, -size * 0.18, 1.5, 0, Math.PI * 2);
        ctx.arc(-size * 0.40, -size * 0.14, 1.5, 0, Math.PI * 2);
        ctx.arc(-size * 0.43, -size * 0.13, 1.5, 0, Math.PI * 2);
        ctx.arc(size * 0.44, -size * 0.18, 1.5, 0, Math.PI * 2);
        ctx.arc(size * 0.40, -size * 0.14, 1.5, 0, Math.PI * 2);
        ctx.arc(size * 0.43, -size * 0.13, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Big smile
        ctx.strokeStyle = "#1e293b";
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -size * 0.15, size * 0.38, 0, Math.PI, false);
        ctx.stroke();
        
        // Inner mouth
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -size * 0.15, size * 0.38, 0, Math.PI, false);
        ctx.clip();
        ctx.fillStyle = "#7f1d1d";
        ctx.fill();
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(0, size * 0.22, size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Buck Teeth
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.rect(-size * 0.11, -size * 0.15 + size * 0.38, size * 0.09, size * 0.1);
        ctx.rect(size * 0.02, -size * 0.15 + size * 0.38, size * 0.09, size * 0.1);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      };

      const drawPatrick = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.95, size * 0.75, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        const pinkStar = "#fca5a5";

        // Starfish Arms & Legs
        ctx.fillStyle = pinkStar;
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.1);
        ctx.quadraticCurveTo(size * 0.2, -size * 0.5, size * 0.8, -size * 0.2);
        ctx.quadraticCurveTo(size * 0.5, size * 0.2, size * 0.65, size * 0.95);
        ctx.quadraticCurveTo(0, size * 0.7, -size * 0.65, size * 0.95);
        ctx.quadraticCurveTo(-size * 0.5, size * 0.2, -size * 0.8, -size * 0.2);
        ctx.quadraticCurveTo(-size * 0.2, -size * 0.5, 0, -size * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Swim Trunks
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, size * 0.15);
        ctx.quadraticCurveTo(0, size * 0.32, size * 0.8, size * 0.15);
        ctx.lineTo(size * 0.65, size * 0.95);
        ctx.quadraticCurveTo(0, size * 0.7, -size * 0.65, size * 0.95);
        ctx.closePath();
        ctx.clip();

        // Fill Lime Green
        ctx.fillStyle = "#84cc16";
        ctx.beginPath();
        ctx.rect(-size, 0, size * 2, size * 2);
        ctx.fill();

        // Draw Purple Flowers
        ctx.fillStyle = "#a855f7";
        const drawFlower = (fx: number, fy: number, r: number) => {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const px = fx + Math.cos(angle) * r;
            const py = fy + Math.sin(angle) * r;
            ctx.arc(px, py, r * 0.7, 0, Math.PI * 2);
          }
          ctx.fill();
        };
        drawFlower(-size * 0.3, size * 0.45, size * 0.1);
        drawFlower(size * 0.3, size * 0.5, size * 0.1);
        drawFlower(size * 0.05, size * 0.75, size * 0.08);
        drawFlower(-size * 0.25, size * 0.8, size * 0.07);
        drawFlower(size * 0.35, size * 0.85, size * 0.08);

        ctx.restore();

        // Redraw pants waistline border
        ctx.beginPath();
        ctx.moveTo(-size * 0.55, size * 0.22);
        ctx.quadraticCurveTo(0, size * 0.35, size * 0.55, size * 0.22);
        ctx.stroke();

        // Navel
        ctx.fillStyle = pinkStar;
        ctx.beginPath();
        ctx.arc(0, size * 0.1, size * 0.04, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.38, size * 0.11, size * 0.16, -Math.PI / 24, 0, Math.PI * 2);
        ctx.ellipse(size * 0.1, -size * 0.38, size * 0.11, size * 0.16, Math.PI / 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-size * 0.07, -size * 0.35, size * 0.03, 0, Math.PI * 2);
        ctx.arc(size * 0.07, -size * 0.35, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = "#7c2d12";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, -size * 0.56); ctx.lineTo(-size * 0.08, -size * 0.51);
        ctx.moveTo(size * 0.2, -size * 0.56); ctx.lineTo(size * 0.08, -size * 0.51);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.fillStyle = "#7f1d1d";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.12, size * 0.15, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Soft pink tongue inside
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.12, size * 0.15, size * 0.12, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#fca5a5";
        ctx.beginPath();
        ctx.arc(0, -size * 0.05, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Cheeks/smile dimple lines
        ctx.beginPath();
        ctx.arc(-size * 0.22, -size * 0.16, size * 0.04, Math.PI * 0.8, Math.PI * 1.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size * 0.22, -size * 0.16, size * 0.04, Math.PI * 1.2, Math.PI * 0.2);
        ctx.stroke();

        ctx.restore();
      };

      const drawHelloKitty = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.58, size * 0.55, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body with red shirt & blue overalls
        ctx.fillStyle = "#ffffff";
        // Arms
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.ellipse(-size * 0.35, size * 0.35, size * 0.15, size * 0.22, Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(size * 0.35, size * 0.35, size * 0.15, size * 0.22, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.45, size * 0.45, size * 0.1, 0, Math.PI * 2);
        ctx.arc(size * 0.45, size * 0.45, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Blue overalls
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.roundRect(-size * 0.35, size * 0.15, size * 0.7, size * 0.42, size * 0.1);
        ctx.fill();
        ctx.stroke();

        // Yellow buttons
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.arc(-size * 0.18, size * 0.28, size * 0.04, 0, Math.PI * 2);
        ctx.arc(size * 0.18, size * 0.28, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.15, size * 0.65, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.beginPath();
        ctx.moveTo(-size * 0.45, -size * 0.4);
        ctx.quadraticCurveTo(-size * 0.55, -size * 0.8, -size * 0.22, -size * 0.55);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.45, -size * 0.4);
        ctx.quadraticCurveTo(size * 0.55, -size * 0.8, size * 0.22, -size * 0.55);
        ctx.fill();
        ctx.stroke();

        // Redraw head to clean overlaps
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.15, size * 0.62, size * 0.47, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iconic Red Bow
        ctx.fillStyle = "#ef4444";
        const bx = size * 0.32;
        const by = -size * 0.45;
        ctx.beginPath();
        ctx.ellipse(bx - size * 0.14, by - size * 0.03, size * 0.14, size * 0.11, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(bx + size * 0.14, by + size * 0.03, size * 0.14, size * 0.11, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx, by, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bead Eyes
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(-size * 0.24, -size * 0.12, size * 0.05, size * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.24, -size * 0.12, size * 0.05, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Yellow Nose
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.05, size * 0.07, size * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Whiskers
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.45, -size * 0.1); ctx.lineTo(-size * 0.72, -size * 0.14);
        ctx.moveTo(-size * 0.48, -size * 0.02); ctx.lineTo(-size * 0.76, -size * 0.02);
        ctx.moveTo(-size * 0.45, size * 0.06); ctx.lineTo(-size * 0.72, size * 0.1);
        ctx.moveTo(size * 0.45, -size * 0.1); ctx.lineTo(size * 0.72, -size * 0.14);
        ctx.moveTo(size * 0.48, -size * 0.02); ctx.lineTo(size * 0.76, -size * 0.02);
        ctx.moveTo(size * 0.45, size * 0.06); ctx.lineTo(size * 0.72, size * 0.1);
        ctx.stroke();

        ctx.restore();
      };

      const drawBluey = (ctx: CanvasRenderingContext2D, size: number, eyeMode: string) => {
        ctx.save();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Soft Ground Shadow
        ctx.fillStyle = "rgba(30, 41, 59, 0.08)";
        ctx.beginPath();
        ctx.ellipse(0, size * 0.68, size * 0.6, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        const blueDark = "#1e3a8a";
        const blueMedium = "#3b82f6";
        const blueLight = "#93c5fd";
        const creamTan = "#fed7aa";

        // Body
        ctx.fillStyle = blueMedium;
        ctx.beginPath();
        ctx.roundRect(-size * 0.5, -size * 0.65, size * 1.0, size * 1.3, size * 0.2);
        ctx.fill();
        ctx.stroke();

        // Dark Blue Patches
        ctx.fillStyle = blueDark;
        ctx.beginPath();
        ctx.ellipse(-size * 0.24, -size * 0.18, size * 0.2, size * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.24, -size * 0.18, size * 0.2, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Light Blue Belly Plate
        ctx.fillStyle = blueLight;
        ctx.beginPath();
        ctx.roundRect(-size * 0.35, size * 0.22, size * 0.7, size * 0.42, size * 0.15);
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.fillStyle = blueMedium;
        ctx.beginPath();
        ctx.moveTo(-size * 0.45, -size * 0.55);
        ctx.lineTo(-size * 0.5, -size * 1.0);
        ctx.lineTo(-size * 0.15, -size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = creamTan;
        ctx.beginPath();
        ctx.moveTo(-size * 0.41, -size * 0.6);
        ctx.lineTo(-size * 0.45, -size * 0.9);
        ctx.lineTo(-size * 0.21, -size * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = blueMedium;
        ctx.beginPath();
        ctx.moveTo(size * 0.45, -size * 0.55);
        ctx.lineTo(size * 0.5, -size * 1.0);
        ctx.lineTo(size * 0.15, -size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = creamTan;
        ctx.beginPath();
        ctx.moveTo(size * 0.41, -size * 0.6);
        ctx.lineTo(size * 0.45, -size * 0.9);
        ctx.lineTo(size * 0.21, -size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Tan Muzzle / Snout
        ctx.fillStyle = creamTan;
        ctx.beginPath();
        ctx.roundRect(-size * 0.32, -size * 0.05, size * 0.64, size * 0.36, size * 0.1);
        ctx.fill();
        ctx.stroke();

        // Nose
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.05, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.beginPath();
        ctx.arc(0, size * 0.08, size * 0.14, 0.1 * Math.PI, 0.9 * Math.PI, false);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-size * 0.22, -size * 0.18, size * 0.11, size * 0.14, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.22, -size * 0.18, size * 0.11, size * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.16, size * 0.05, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.16, size * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Glints
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.22, -size * 0.18, size * 0.02, 0, Math.PI * 2);
        ctx.arc(size * 0.18, -size * 0.18, size * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.fillStyle = creamTan;
        ctx.beginPath();
        ctx.roundRect(-size * 0.36, -size * 0.44, size * 0.16, size * 0.08, size * 0.02);
        ctx.roundRect(size * 0.2, -size * 0.44, size * 0.16, size * 0.08, size * 0.02);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      };

      // --- SEASONAL PROCEDURAL GRAPHICS ---
      const drawWinterHat = (ctx: CanvasRenderingContext2D, size: number) => {
        const redGrad = ctx.createLinearGradient(-size * 0.8, 0, size * 0.8, 0);
        redGrad.addColorStop(0, "#be185d");
        redGrad.addColorStop(0.4, "#ef4444");
        redGrad.addColorStop(1, "#991b1b");
        ctx.fillStyle = redGrad;

        ctx.beginPath();
        ctx.ellipse(
          0,
          size * 0.1,
          size * 0.8,
          size * 0.55,
          0,
          Math.PI,
          0,
          false,
        );
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, size * 0.1, size * 0.85, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -size * 0.42, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawSunglasses = (ctx: CanvasRenderingContext2D, size: number) => {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = Math.max(3.5, size * 0.15);
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();

        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(-size * 0.4, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size * 0.4, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size * 0.1);
        ctx.lineTo(-size * 0.3, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.3, -size * 0.1);
        ctx.lineTo(size * 0.5, size * 0.1);
        ctx.stroke();
      };

      // --- ACCESSORIES PR    // --- ACCESSORIES PROCEDURAL DRAWING ---
      const drawCrown = (ctx: CanvasRenderingContext2D, size: number) => {
        // High fidelity golden 3D gradient
        const crownGrad = ctx.createLinearGradient(
          -size * 0.8,
          0,
          size * 0.8,
          0,
        );
        crownGrad.addColorStop(0, "#ca8a04"); // deep gold
        crownGrad.addColorStop(0.3, "#fde047"); // yellow gold highlight
        crownGrad.addColorStop(0.5, "#fef08a"); // central specular shine
        crownGrad.addColorStop(0.7, "#facc15"); // amber gold
        crownGrad.addColorStop(1, "#a16207"); // darker edge shadow
        ctx.fillStyle = crownGrad;

        ctx.beginPath();
        ctx.moveTo(-size * 0.8, size * 0.3);
        ctx.lineTo(size * 0.8, size * 0.3);
        ctx.lineTo(size * 1.0, -size * 0.8);
        ctx.lineTo(size * 0.4, -size * 0.2);
        ctx.lineTo(0, -size * 1.0);
        ctx.lineTo(-size * 0.4, -size * 0.2);
        ctx.lineTo(-size * 1.0, -size * 0.8);
        ctx.closePath();
        ctx.fill();

        // Shiny ruby gems on peaks
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, -size * 0.9, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(-size * 0.75, -size * 0.6, size * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.75, -size * 0.6, size * 0.11, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawPartyHat = (ctx: CanvasRenderingContext2D, size: number) => {
        // Soft neon pink 3D gradient hat
        const coneGrad = ctx.createLinearGradient(
          -size * 0.6,
          0,
          size * 0.6,
          0,
        );
        coneGrad.addColorStop(0, "#db2777");
        coneGrad.addColorStop(0.4, "#f472b6");
        coneGrad.addColorStop(0.7, "#ec4899");
        coneGrad.addColorStop(1, "#be185d");
        ctx.fillStyle = coneGrad;

        ctx.beginPath();
        ctx.moveTo(-size * 0.6, size * 0.3);
        ctx.lineTo(size * 0.6, size * 0.3);
        ctx.lineTo(0, -size * 1.5);
        ctx.closePath();
        ctx.fill();

        // Fluffy blue pompom
        const pomGrad = ctx.createRadialGradient(
          0,
          -size * 1.5,
          2,
          0,
          -size * 1.5,
          size * 0.26,
        );
        pomGrad.addColorStop(0, "#bae6fd");
        pomGrad.addColorStop(0.6, "#38bdf8");
        pomGrad.addColorStop(1, "#0284c7");
        ctx.fillStyle = pomGrad;
        ctx.beginPath();
        ctx.arc(0, -size * 1.5, size * 0.26, 0, Math.PI * 2);
        ctx.fill();

        // Striped diagonal ribbons
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.35, size * 0.1);
        ctx.lineTo(size * 0.22, -size * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, -size * 0.6);
        ctx.lineTo(size * 0.15, -size * 1.1);
        ctx.stroke();
      };

      const drawWizardHat = (ctx: CanvasRenderingContext2D, size: number) => {
        // Deep magical velvet indigo gradient
        const brimGrad = ctx.createLinearGradient(
          -size * 1.2,
          0,
          size * 1.2,
          0,
        );
        brimGrad.addColorStop(0, "#1e1b4b");
        brimGrad.addColorStop(0.5, "#4c1d95");
        brimGrad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = brimGrad;

        ctx.beginPath();
        ctx.moveTo(-size * 1.2, size * 0.3);
        ctx.lineTo(size * 1.2, size * 0.3);
        ctx.lineTo(size * 0.8, 0);
        ctx.lineTo(-size * 0.8, 0);
        ctx.closePath();
        ctx.fill();

        const coneGrad = ctx.createLinearGradient(0, -size * 1.8, 0, 0);
        coneGrad.addColorStop(0, "#a855f7");
        coneGrad.addColorStop(0.6, "#4c1d95");
        coneGrad.addColorStop(1, "#311042");
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, 0);
        ctx.lineTo(size * 0.6, 0);
        ctx.lineTo(0, -size * 1.8);
        ctx.closePath();
        ctx.fill();

        // Magic gold star embellishment
        ctx.fillStyle = "#fde047";
        drawStar(ctx, 0, -size * 0.8, size * 0.22);
      };

      const drawGlasses = (ctx: CanvasRenderingContext2D, size: number) => {
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = Math.max(3.2, size * 0.15);
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();

        ctx.fillStyle = "rgba(186, 230, 253, 0.35)"; // glossy blue-tint glass
        ctx.beginPath();
        ctx.arc(-size * 0.4, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(size * 0.4, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cute highlight line on lenses
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size * 0.15);
        ctx.lineTo(-size * 0.3, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.3, -size * 0.15);
        ctx.lineTo(size * 0.5, size * 0.1);
        ctx.stroke();
      };

      const drawTie = (ctx: CanvasRenderingContext2D, size: number) => {
        // Red striped tie with 3D gradient
        const tieGrad = ctx.createLinearGradient(
          -size * 0.25,
          0,
          size * 0.25,
          0,
        );
        tieGrad.addColorStop(0, "#dc2626");
        tieGrad.addColorStop(0.4, "#f87171");
        tieGrad.addColorStop(0.7, "#ef4444");
        tieGrad.addColorStop(1, "#991b1b");
        ctx.fillStyle = tieGrad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size * 0.25, size * 0.2);
        ctx.lineTo(-size * 0.2, size * 0.9);
        ctx.lineTo(0, size * 1.25);
        ctx.lineTo(size * 0.2, size * 0.9);
        ctx.lineTo(size * 0.25, size * 0.2);
        ctx.closePath();
        ctx.fill();

        // Golden elegant stripes
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.24, size * 0.35);
        ctx.lineTo(size * 0.21, size * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, size * 0.65);
        ctx.lineTo(size * 0.18, size * 0.85);
        ctx.stroke();

        // Knot
        ctx.fillStyle = "#b91c1c";
        ctx.beginPath();
        ctx.moveTo(-size * 0.18, 0);
        ctx.lineTo(size * 0.18, 0);
        ctx.lineTo(size * 0.1, size * 0.2);
        ctx.lineTo(-size * 0.1, size * 0.2);
        ctx.closePath();
        ctx.fill();
      };

      const drawFlower = (ctx: CanvasRenderingContext2D, size: number) => {
        // Draw 5 pink petals
        ctx.fillStyle = "#f472b6";
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const px = Math.cos(angle) * size * 0.35;
          const py = Math.sin(angle) * size * 0.35;
          const petalGrad = ctx.createRadialGradient(
            px,
            py,
            1,
            px,
            py,
            size * 0.25,
          );
          petalGrad.addColorStop(0, "#fbcfe8");
          petalGrad.addColorStop(1, "#ec4899");
          ctx.fillStyle = petalGrad;
          ctx.beginPath();
          ctx.arc(px, py, size * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center of the flower (yellow)
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawDetective = (ctx: CanvasRenderingContext2D, size: number) => {
        // Draw search magnifying glass
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.85, size * 0.85);
        ctx.stroke();

        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };

      const drawHomeBack = (
        ctx: CanvasRenderingContext2D,
        homeX: number,
        homeY: number,
        style: string,
      ) => {
        ctx.save();
        ctx.translate(homeX, homeY);
        if (style === "basket") {
          // Basket back-wall and comfortable cushion inside
          ctx.fillStyle = "#7c2d12";
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, -6, 45, 28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#f43f5e"; // red cushion
          ctx.beginPath();
          ctx.ellipse(0, 2, 40, 16, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#e11d48";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(-20, 2, 10, 0, Math.PI, true);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(20, 2, 10, 0, Math.PI, true);
          ctx.stroke();
        } else if (style === "nest") {
          // Nest soft bird cotton lining
          ctx.fillStyle = "#fef3c7";
          ctx.beginPath();
          ctx.ellipse(0, -5, 42, 24, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#7c2f00";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(0, -2, 46, 26, 0.05, 0, Math.PI, true);
          ctx.stroke();
        } else if (style === "tent") {
          // Tent dark interior background
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.moveTo(0, -55);
          ctx.lineTo(-44, 8);
          ctx.lineTo(44, 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#818cf8"; // cozy blue blanket base
          ctx.beginPath();
          ctx.ellipse(0, 3, 30, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === "capsule") {
          // UFO spaceship metal capsule cockpit
          const grad = ctx.createRadialGradient(0, -25, 5, 0, -20, 60);
          grad.addColorStop(0, "#1e293b");
          grad.addColorStop(1, "#0f172a");
          ctx.fillStyle = grad;
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, -20, 42, Math.PI, 0, false);
          ctx.lineTo(42, 10);
          ctx.lineTo(-42, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#22c55e"; // active green indicator
          ctx.beginPath();
          ctx.arc(-22, -15, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ef4444"; // error red indicator
          ctx.beginPath();
          ctx.arc(-13, -18, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3b82f6"; // beacon blue indicator
          ctx.beginPath();
          ctx.arc(20, -15, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      const drawHomeFront = (
        ctx: CanvasRenderingContext2D,
        homeX: number,
        homeY: number,
        style: string,
      ) => {
        ctx.save();
        ctx.translate(homeX, homeY);
        if (style === "basket") {
          // Front rim with wicker pattern
          ctx.fillStyle = "#9a3412";
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 5, 45, 22, 0, 0, Math.PI, false);
          ctx.lineTo(-45, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // horizontal bands
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 5, 40, 15, 0, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, 5, 34, 10, 0, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();

          // vertical bands segment detail
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          for (let xOff = -35; xOff <= 35; xOff += 14) {
            ctx.beginPath();
            ctx.moveTo(xOff, 5);
            const bottomY =
              5 + Math.sqrt(Math.max(0, 1 - (xOff * xOff) / (45 * 45))) * 22;
            ctx.lineTo(xOff * 0.9, bottomY);
            ctx.stroke();
          }

          // top braid
          ctx.strokeStyle = "#ea580c";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(-45, 4);
          ctx.lineTo(45, 4);
          ctx.stroke();
        } else if (style === "nest") {
          ctx.strokeStyle = "#854d0e";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          const drawTwig = (
            sx: number,
            sy: number,
            ex: number,
            ey: number,
            cpY: number,
          ) => {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(0, cpY, ex, ey);
            ctx.stroke();
          };
          ctx.strokeStyle = "#a16207";
          drawTwig(-44, 2, 44, 1, 28);
          ctx.strokeStyle = "#854d0e";
          drawTwig(-46, 6, 40, 9, 34);
          ctx.strokeStyle = "#713f12";
          drawTwig(-38, 12, 46, 7, 31);
          ctx.strokeStyle = "#a16207";
          drawTwig(-42, 8, 42, 10, 36);
          ctx.strokeStyle = "#713f12";
          drawTwig(-45, -2, 45, -1, 22);

          // green leaf accessory
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.ellipse(25, 12, 10, 5, 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === "tent") {
          ctx.strokeStyle = "#0f766e"; // poles
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, -55);
          ctx.lineTo(-44, 8);
          ctx.moveTo(0, -55);
          ctx.lineTo(44, 8);
          ctx.stroke();

          ctx.fillStyle = "#0d9488"; // teal wall
          ctx.beginPath();
          ctx.moveTo(-44, 8);
          ctx.lineTo(-24, 8);
          ctx.lineTo(0, -55);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(44, 8);
          ctx.lineTo(24, 8);
          ctx.lineTo(0, -55);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#f59e0b"; // yellow stripes
          ctx.beginPath();
          ctx.moveTo(-36, 8);
          ctx.lineTo(-28, 8);
          ctx.lineTo(0, -55);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(36, 8);
          ctx.lineTo(28, 8);
          ctx.lineTo(0, -55);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#115e59"; // rolled folds
          ctx.beginPath();
          ctx.ellipse(-24, -12, 4, 15, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(24, -12, 4, 15, -0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === "capsule") {
          const shieldGrad = ctx.createLinearGradient(0, -25, 0, 18);
          shieldGrad.addColorStop(0, "rgba(34, 211, 238, 0.22)");
          shieldGrad.addColorStop(1, "rgba(8, 145, 178, 0.45)");
          ctx.fillStyle = shieldGrad;
          ctx.beginPath();
          ctx.ellipse(0, 4, 42, 21, 0, 0, Math.PI, false);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)"; // shine glaze line
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 4, 38, 0.15 * Math.PI, 0.45 * Math.PI, false);
          ctx.stroke();

          ctx.fillStyle = "#1e293b"; // space alloy mount base
          ctx.beginPath();
          ctx.ellipse(0, 10, 46, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#22d3ee"; // blinking status LEDs
          ctx.beginPath();
          ctx.arc(-24, 10, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 11, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(24, 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      const draw = (t: number) => {
        if (rect.width <= 50 || rect.height <= 50) {
          animationFrameId = requestAnimationFrame(draw);
          return;
        }

        const isCalmActive = isCalm || isDashboard;
        const dt = t - stateRef.current.lastTime;
        stateRef.current.lastTime = t;
        time += 0.05;

        const state = stateRef.current;
        const p = state.pet;
        let floorY = rect.height - 47;

        // Sleep state transition over ~45 frames (0 to 1)
        if (state.prevBehaviorMode !== behaviorMode) {
          state.sleepTransitionDir =
            behaviorMode === "sleep" ? "toSleep" : "fromSleep";
          state.sleepTransitionFrames = ANIM_SLEEP_TRANSITION_FRAMES;
          state.prevBehaviorMode = behaviorMode;
        }

        if (state.sleepTransitionFrames > 0) {
          state.sleepTransitionFrames--;
          if (state.sleepTransitionDir === "toSleep") {
            state.sleepTransitionValue = Math.max(
              0.0,
              state.sleepTransitionValue - 1.0 / ANIM_SLEEP_TRANSITION_FRAMES,
            );
          } else {
            state.sleepTransitionValue = Math.min(
              1.0,
              state.sleepTransitionValue + 1.0 / ANIM_SLEEP_TRANSITION_FRAMES,
            );
          }
          if (state.sleepTransitionFrames === 0) {
            state.sleepTransitionDir = null;
          }
        }

        // Jump Queue / Anticipation handling
        if (state.jumpQueue) {
          state.jumpQueue.framesLeft--;
          if (state.jumpQueue.framesLeft <= 0) {
            // Deploy the jump!
            p.vy = state.jumpQueue.vy;
            p.bounceTimer = state.jumpQueue.bounceTimer;
            p.isSalto = state.jumpQueue.isSalto;
            if (p.isSalto) p.saltoAngle = 0;
            state.jumpQueue = null;
          }
        }

        // Squash & Stretch Math Core and land oscillations
        if (state.jumpQueue) {
          // ANTIZIPATION Phase: Squash Y down to 0.8 / stretch X up to 1.15
          state.squashY = 0.8;
          state.squashX = 1.15;
          state.landTimer = 0;
        } else if (p.y < floorY - 5) {
          // FLUGPHASE: Proportional to vertical speed vy (negative vy -> upward stretch)
          if (p.vy < 0) {
            const ratio = Math.max(0, Math.min(1, Math.abs(p.vy) / 16));
            state.squashY = 1.0 + 0.15 * ratio;
            state.squashX = 1.0 - 0.1 * ratio;
          } else {
            const ratio = Math.max(0, Math.min(1, Math.abs(p.vy) / 16));
            state.squashY = 1.0 + 0.05 * ratio;
            state.squashX = 1.0 - 0.03 * ratio;
          }
          state.landTimer = 0;
        } else if (state.landTimer > 0) {
          // LANDUNG: bounce with decaying cosine spring equations
          state.landTimer--;
          const frameIndex = 10 - state.landTimer; // 1 to 10
          const decay = Math.exp(-0.25 * frameIndex);
          const coeff = 0.25 * decay * Math.cos(0.8 * frameIndex);
          state.squashY = 1.0 - coeff;
          state.squashX = 1.0 + coeff;
        } else {
          // IDLE / BREATHING: Soft, organic breathing if not climbing or hanging
          if (behaviorMode === "sleep") {
            state.breathePhase += ANIM_BREATHE_SPEED_SLEEP;
            const amp = Math.sin(state.breathePhase);
            state.squashY = 1.0 + amp * ANIM_BREATHE_DEPTH_SLEEP;
            state.squashX = 1.0 - amp * (ANIM_BREATHE_DEPTH_SLEEP * 0.7);
          } else if (behaviorMode === "wander") {
            state.breathePhase += ANIM_BREATHE_SPEED_WANDER;
            const amp = Math.sin(state.breathePhase);
            state.squashY = 1.0 + amp * ANIM_BREATHE_DEPTH_WANDER;
            state.squashX = 1.0 - amp * (ANIM_BREATHE_DEPTH_WANDER * 0.6);
          } else {
            state.squashY = 1.0;
            state.squashX = 1.0;
          }
        }

        // Clamp values securely to protect layouts
        state.squashX = Math.max(0.7, Math.min(1.3, state.squashX));
        state.squashY = Math.max(0.7, Math.min(1.3, state.squashY));

        // Blink logic scheduler
        if (state.blinkTimer > 0) {
          state.blinkTimer--;
        } else if (state.blinkPhase === 0) {
          state.blinkPhase = 1; // closing
        }

        if (state.blinkPhase > 0) {
          if (state.blinkPhase <= ANIM_BLINK_DURATION) {
            p.eyeScaleY = 0.0;
            state.blinkPhase++;
          } else {
            p.eyeScaleY = 1.0;
            state.blinkPhase = 0;
            if (!state.hasDoubleBlinked && Math.random() < 0.35) {
              state.hasDoubleBlinked = true;
              state.blinkTimer = 10;
            } else {
              state.hasDoubleBlinked = false;
              state.blinkTimer =
                Math.floor(Math.random() * (ANIM_BLINK_MAX - ANIM_BLINK_MIN)) +
                ANIM_BLINK_MIN;
            }
          }
        }

        // Idle microaction selector
        if (
          behaviorMode !== "sleep" &&
          !isCalmActive &&
          !state.jumpQueue &&
          p.y >= floorY - 5
        ) {
          if (state.idleTimer > 0) {
            state.idleTimer--;
          } else if (!state.idleAction) {
            const actTypes: (
              | "putzen"
              | "gaehnen"
              | "strecken"
              | "umschauen"
              | "wedeln"
              | "kopfneigen"
            )[] = [
              "putzen",
              "gaehnen",
              "strecken",
              "umschauen",
              "wedeln",
              "kopfneigen",
            ];
            const typ = actTypes[Math.floor(Math.random() * actTypes.length)];
            const dauer =
              typ === "gaehnen"
                ? 60
                : typ === "putzen"
                  ? 120
                  : typ === "strecken"
                    ? 80
                    : typ === "kopfneigen"
                      ? 60
                      : 90;
            state.idleAction = { typ, frame: 0, dauer };
          }
        } else if (state.idleAction) {
          state.idleAction = null;
        }

        if (state.idleAction) {
          const act = state.idleAction;
          act.frame++;
          if (act.frame >= act.dauer) {
            state.idleAction = null;
            state.idleTimer =
              Math.floor(
                Math.random() *
                  (ANIM_IDLE_MAX_INTERVAL - ANIM_IDLE_MIN_INTERVAL),
              ) + ANIM_IDLE_MIN_INTERVAL;
          } else {
            if (act.typ === "umschauen") {
              const yawPhase = Math.floor(act.frame / 30);
              targetPupilOffsetX = yawPhase % 2 === 0 ? 10 : -10;
              targetPupilOffsetY = -4;
            } else if (act.typ === "gaehnen") {
              p.eyeScaleY = 0.2;
              targetPupilOffsetX = 0;
              targetPupilOffsetY = 0;
              if (act.frame === 25) {
                state.particles.push({
                  x: p.x + (p.vx >= 0 ? 14 : -14),
                  y: p.y - 20,
                  vx: (p.vx >= 0 ? 1.5 : -1.5) + (Math.random() - 0.5) * 0.5,
                  vy: -1.8 - Math.random() * 0.8,
                  life: 1.0,
                  color: "rgba(224, 242, 254, 0.7)",
                  emoji: "💭",
                  type: "default",
                  sizeScale: 0.7,
                });
              }
            } else if (act.typ === "putzen") {
              if (act.frame % 20 === 0) {
                state.particles.push({
                  x: p.x + (Math.random() - 0.5) * 30,
                  y: p.y - 10 - Math.random() * 20,
                  vx: (Math.random() - 0.5) * 2,
                  vy: -0.6 - Math.random() * 0.6,
                  life: 0.8,
                  color: "#38bdf8",
                  emoji: "✨",
                  type: "default",
                  sizeScale: 0.4 + Math.random() * 0.3,
                });
              }
            } else if (act.typ === "strecken") {
              if (act.frame === 1) {
                p.stretchTimer = act.dauer;
              }
            }
          }
        }

        const size = 26 * (scaleRef.current || 1.0);
        const isTyping = Date.now() - lastTypeTime < 2000;

        if (behaviorMode === "sleep") {
          targetPupilOffsetX = 0;
          targetPupilOffsetY = 0;
        } else {
          // ACTIVE CONTINOUS FOCUS-FOLLOWING & INTUITIVE TARGET DECISION ALGORITHM
          const petRect = canvas.getBoundingClientRect();
          const petCenterX = petRect.left + petRect.width / 2;
          const petCenterY = petRect.top + petRect.height / 2;

          // Fetch active widgets
          const widgetElms = document.querySelectorAll(
            '[data-classpet-widget="true"]',
          );
          const activeWidgetCount = widgetElms.length;

          // 1. Detect if a widget was newly activated/opened
          if (activeWidgetCount > lastWidgetCount) {
            const newestWidget = widgetElms[activeWidgetCount - 1];
            if (newestWidget) {
              const wr = newestWidget.getBoundingClientRect();
              lastActivatedWidgetPos = {
                x: wr.left + wr.width / 2,
                y: wr.top + wr.height / 2,
              };
              widgetGazeDuration = 180; // look at new widget for ~3 seconds
            }
          }
          lastWidgetCount = activeWidgetCount;

          let lookAtTargetX: number | null = null;
          let lookAtTargetY: number | null = null;
          let activeReadingJitterX = 0;
          let activeReadingJitterY = 0;

          const activeEl = document.activeElement;
          const isInputField =
            activeEl &&
            (activeEl.tagName === "INPUT" ||
              activeEl.tagName === "TEXTAREA" ||
              activeEl.hasAttribute("contenteditable") ||
              activeEl.closest('[contenteditable="true"]'));

          const closestToy = stateRef.current.toys[0];

          // Track focusing conditions with priority:
          if (closestToy) {
            // Prioritize gazing towards the physics toy floating/bouncing in the playground!
            const canvasRect = canvas.getBoundingClientRect();
            lookAtTargetX = canvasRect.left + closestToy.x;
            lookAtTargetY = canvasRect.top + closestToy.y;
          } else if (behaviorMode === "learn") {
            // Focus on the learning book!
            const canvasRect = canvas.getBoundingClientRect();
            lookAtTargetX =
              canvasRect.left + stateRef.current.pet.x + size * 0.9;
            lookAtTargetY =
              canvasRect.top + stateRef.current.pet.y + size * 0.7;

            // Add slight learning reading jitter
            activeReadingJitterX = Math.sin(time * 0.8) * (size * 0.05);
            activeReadingJitterY = Math.cos(time * 0.4) * (size * 0.02);
          } else if (isTyping && isInputField && activeEl) {
            // Priority A: User is typing! Follow the text entry field exactly
            const activeRect = activeEl.getBoundingClientRect();
            lookAtTargetX = activeRect.left + activeRect.width / 2;
            lookAtTargetY = activeRect.top + activeRect.height / 2;

            // Add high fidelity organic reading gaze jitter
            activeReadingJitterX = Math.sin(time * 15) * (size * 0.045);
            activeReadingJitterY = Math.cos(time * 10) * (size * 0.015);
          } else if (widgetGazeDuration > 0 && lastActivatedWidgetPos) {
            // Priority B: Gaze locked on the newly activated widget
            widgetGazeDuration--;
            lookAtTargetX = lastActivatedWidgetPos.x;
            lookAtTargetY = lastActivatedWidgetPos.y;
          } else {
            // Priority C: Check if any widget contains current active focus, or default to general mouse follow
            let focusedWidgetRect: DOMRect | null = null;
            if (activeEl) {
              for (let i = 0; i < widgetElms.length; i++) {
                if (widgetElms[i].contains(activeEl)) {
                  focusedWidgetRect = widgetElms[i].getBoundingClientRect();
                  break;
                }
              }
            }

            if (focusedWidgetRect) {
              lookAtTargetX =
                focusedWidgetRect.left + focusedWidgetRect.width / 2;
              lookAtTargetY =
                focusedWidgetRect.top + focusedWidgetRect.height / 2;
            } else {
              // Default to continuous Mouse following coordinates
              lookAtTargetX = mouseX;
              lookAtTargetY = mouseY;
            }
          }

          const hasMovedMouseRecently = Date.now() - lastMouseMoveTime < 5000;

          if (
            lookAtTargetX !== null &&
            lookAtTargetY !== null &&
            (hasMovedMouseRecently ||
              isTyping ||
              widgetGazeDuration > 0 ||
              closestToy)
          ) {
            const dx = lookAtTargetX - petCenterX;
            const dy = lookAtTargetY - petCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 6) {
              const angle = Math.atan2(dy, dx);
              const maxPupilDist = size * 0.16; // Max displacement
              const offsetScale = Math.min(1.0, dist / 220); // softer close-up gaze
              targetPupilOffsetX =
                Math.cos(angle) * maxPupilDist * offsetScale +
                activeReadingJitterX;
              targetPupilOffsetY =
                Math.sin(angle) * maxPupilDist * offsetScale +
                activeReadingJitterY;
            } else {
              targetPupilOffsetX = activeReadingJitterX;
              targetPupilOffsetY = activeReadingJitterY;
            }
          } else {
            // Slowly return to forward gaze with a soft ambient idle sway
            targetPupilOffsetX =
              Math.sin(time * 0.4) * (size * 0.04) + activeReadingJitterX;
            targetPupilOffsetY =
              Math.cos(time * 0.25) * (size * 0.02) + activeReadingJitterY;
          }
        }

        // If mouse is hover/over canvas, clamp pupil target displacement to max ±2px
        if (stateRef.current.mouse.isOver && behaviorMode !== "sleep") {
          targetPupilOffsetX = Math.max(-2, Math.min(2, targetPupilOffsetX));
          targetPupilOffsetY = Math.max(-2, Math.min(2, targetPupilOffsetY));
        }

        // Smoothly lerp actual pupil position with beautiful organic easing delay
        pupilOffsetX += (targetPupilOffsetX - pupilOffsetX) * 0.09;
        pupilOffsetY += (targetPupilOffsetY - pupilOffsetY) * 0.09;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Update Pet Physics
        floorY = rect.height - 45;

        if (p.eyeScaleY === undefined) p.eyeScaleY = 1.0;
        if (behaviorMode === "sleep") {
          p.vx = 0;
          p.vy = 0;
          p.y = floorY;
          p.bounceTimer = 0;
          p.landBounceValue = 0;

          // Smoothly slide back into the cozy sleeping home in the center!
          const homeX = rect.width / 2;
          p.x += (homeX - p.x) * 0.08;

          if (isWakingUpRef.current) {
            p.eyeScaleY = Math.min(1.0, p.eyeScaleY + 0.08);
          } else {
            p.eyeScaleY = Math.max(0, p.eyeScaleY - 0.05);
          }
        } else {
          p.vy += 0.52;
          p.eyeScaleY = Math.min(1.0, p.eyeScaleY + 0.08);
        }

        if (
          stateRef.current.mouse.scaredTimer > 0 &&
          behaviorMode !== "sleep"
        ) {
          p.eyeScaleY = 1.6;
        }

        // Check Lärmampel status inside the board widgets list
        const isLärmampelActive = boardWidgetsRef.current?.some(
          (w) => w.type === "laerm",
        );

        // --- PHYSICAL TOYS REALTIME COLLISION & MOTION TICK ---
        const toyFloorBoundaryY = floorY + 12;
        const currentMonth = new Date().getMonth();

        let toysToKeep: typeof state.toys = [];

        state.toys.forEach((toy) => {
          let gravity = 0.32;
          let elasticity = 0.78;
          let drag = 1.0;
          let pop = false;

          if (toy.type === "yarn") {
            gravity = 0.38;
            elasticity = 0.42;
          } else if (toy.type === "feather") {
            gravity = 0.05;
            elasticity = 0.35;
            drag = 0.94; // slow drifting float
          } else if (toy.type === "bubble") {
            gravity = -0.01; // floats up slowly
            elasticity = 0.9;
            drag = 0.96;
          } else if (toy.type === "balloon") {
            gravity = 0.02; // very light
            elasticity = 0.6;
            drag = 0.98;
          }

          toy.x += toy.vx;
          toy.y += toy.vy;
          toy.vy += gravity;

          if (drag < 1.0) {
            toy.vx *= drag;
            toy.vy *= drag;
            toy.vx += Math.sin(time * 2.0 + toy.id) * 0.14; // flutter horizontally
          }

          // Left/Right Bounce
          if (toy.x < toy.radius) {
            toy.x = toy.radius;
            if (toy.type === "bubble") pop = true;
            toy.vx = -toy.vx * elasticity;
          } else if (toy.x > rect.width - toy.radius) {
            toy.x = rect.width - toy.radius;
            if (toy.type === "bubble") pop = true;
            toy.vx = -toy.vx * elasticity;
          }

          // Ground Bounce & Roof pop
          if (toy.type === "bubble" && toy.y < -30) {
            pop = true; // popped at ceiling
          } else if (toy.y > toyFloorBoundaryY - toy.radius) {
            if (toy.type === "bubble") {
              pop = true;
            } else {
              toy.y = toyFloorBoundaryY - toy.radius;
              toy.vy = -toy.vy * elasticity;
              toy.vx *= 0.92; // ground friction
              toy.rotSpeed *= 0.88;
            }
          }

          // Rotate
          toy.rotation += toy.rotSpeed + toy.vx * 0.04;

          // Collide with Pet (header/kick)
          const petCenterX = p.x;
          const petCenterY = p.y - 12; // eye/chest level
          const dx = toy.x - petCenterX;
          const dy = toy.y - petCenterY;
          const distToPet = Math.sqrt(dx * dx + dy * dy);

          if (distToPet < toy.radius + 24) {
            if (toy.type === "bubble") {
              pop = true;
            } else {
              const bouncePower =
                toy.type === "feather" || toy.type === "balloon" ? -1.8 : -6.5;
              toy.vy = bouncePower - Math.random() * 2.5;
              toy.vx =
                (dx / (distToPet || 1)) * 6.0 + (Math.random() - 0.5) * 2;
              toy.rotSpeed = (Math.random() - 0.5) * 0.4;

              if (p.y >= floorY - 5) {
                queueJump(-3.8, 22);
              }
            }

            for (let i = 0; i < 4; i++) {
              state.particles.push({
                x: toy.x,
                y: toy.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -1.5 - Math.random() * 2,
                life: 0.8,
                color: ["#fbbf24", "#f87171", "#38bdf8"][
                  Math.floor(Math.random() * 3)
                ],
                emoji: toy.type === "bubble" ? "💦" : "✨",
                type: "default",
                sizeScale: 0.6 + Math.random() * 0.4,
              });
            }
          }

          if (!pop) {
            toysToKeep.push(toy);
          }
        });
        state.toys = toysToKeep;

        // --- SEASONAL WEATHER BACKGROUND PARTICLES INJECTOR ---
        if (behaviorMode !== "sleep" && Math.random() < 0.1) {
          if (currentMonth === 11 || currentMonth === 0 || currentMonth === 1) {
            // Winter
            if (
              state.particles.filter((pt) => pt.type === "snow").length < 18
            ) {
              state.particles.push({
                x: Math.random() * rect.width,
                y: -10,
                vx: (Math.random() - 0.5) * 1.2,
                vy: 0.6 + Math.random() * 1.0,
                life: 1.0,
                color: "white",
                emoji: Math.random() < 0.4 ? "❄️" : "•",
                type: "snow",
                sizeScale: 0.4 + Math.random() * 0.6,
              });
            }
          } else if (
            currentMonth === 8 ||
            currentMonth === 9 ||
            currentMonth === 10
          ) {
            // Autumn
            if (
              state.particles.filter((pt) => pt.type === "leaf").length < 12
            ) {
              state.particles.push({
                x: Math.random() * rect.width,
                y: -10,
                vx: -1.0 - Math.random() * 1.5,
                vy: 0.8 + Math.random() * 1.2,
                life: 1.0,
                color: ["#f97316", "#eab308", "#ca8a04", "#b45309"][
                  Math.floor(Math.random() * 4)
                ],
                emoji: ["🍁", "🍂", "🍃"][Math.floor(Math.random() * 3)],
                type: "leaf",
                sizeScale: 0.5 + Math.random() * 0.6,
              });
            }
          } else if (
            currentMonth === 2 ||
            currentMonth === 3 ||
            currentMonth === 4
          ) {
            // Spring
            if (
              state.particles.filter((pt) => pt.type === "blossom").length < 12
            ) {
              state.particles.push({
                x: Math.random() * rect.width,
                y: -10,
                vx: (Math.random() - 0.5) * 0.8,
                vy: 0.6 + Math.random() * 0.8,
                life: 1.0,
                color: "#f472b6",
                emoji: "🌸",
                type: "blossom",
                sizeScale: 0.4 + Math.random() * 0.5,
              });
            }
          }
        }

        // --- DECREASE HAPPY COOPER TIMEOUTS ---
        if (petHappyCoop > 0) {
          petHappyCoop--;
          p.eyeScaleY = 0.0; // lock closed happy eyes!
        }

        // --- PLATFORM LOOKUP ---
        const canvasRect = canvas.getBoundingClientRect();
        const widgetElms = document.querySelectorAll(
          '[data-classpet-widget="true"]',
        );
        const platforms = Array.from(widgetElms).map((el) => {
          const wrect = el.getBoundingClientRect();
          return {
            left: wrect.left - canvasRect.left,
            right: wrect.right - canvasRect.left,
            top: wrect.top - canvasRect.top,
            bottom: wrect.bottom - canvasRect.top,
            type: el.getAttribute("data-widget-type") || "",
          };
        });

        // --- DECAY DIZZY TIMER ---
        if (p.dizzyTimer > 0) {
          p.dizzyTimer--;
          p.isDizzy = p.dizzyTimer > 0;
        } else {
          p.isDizzy = false;
        }

        // --- SCARED LÄRMREAKTION ---
        const noiseVol = (window as any).__lastNoiseVolume || 0;
        const noiseThresh = (window as any).__noiseThreshold || 35;
        const isLoud =
          noiseVol >= noiseThresh && behaviorMode !== "sleep" && !isDraggingPet;
        p.isScared = isLoud;

        // Override targets if loud (run/duck under nearest widget platform)
        if (isLoud) {
          let shelterPlatform = null;
          let minShelterDist = Infinity;
          platforms.forEach((pf) => {
            const center = (pf.left + pf.right) / 2;
            const dist = Math.abs(p.x - center);
            if (dist < minShelterDist) {
              minShelterDist = dist;
              shelterPlatform = pf;
            }
          });

          if (shelterPlatform) {
            p.targetX = (shelterPlatform.left + shelterPlatform.right) / 2;
            p.targetY = floorY;
            p.targetWall = "bottom";
          } else {
            p.targetX = p.x;
            p.targetY = floorY;
            p.targetWall = "bottom";
          }
          // Shake slightly
          p.x += (Math.random() - 0.5) * 1.5;
        }

        // Decay/increment mouse tracking registers
        if (state.mouse.isOver && behaviorMode !== "sleep") {
          const dxLast = mouseX - state.mouse.lastX;
          const dyLast = mouseY - state.mouse.lastY;
          const frameMouseDragSpeed = Math.sqrt(
            dxLast * dxLast + dyLast * dyLast,
          );

          if (frameMouseDragSpeed < (rect.width > 200 ? 1.5 : 0.8)) {
            state.mouse.stillTime += 0.016;
          } else {
            state.mouse.stillTime = 0;
          }

          // Startle Check:
          const localMouseX = mouseX - rect.left;
          const localMouseY = mouseY - rect.top;

          if (
            frameMouseDragSpeed > 60 &&
            state.mouse.startleCooldown <= 0 &&
            behaviorMode !== ("sleep" as any) &&
            !isDraggingPet
          ) {
            const petScaredDX = p.x - localMouseX;
            const petScaredDY = p.y - size * 0.5 - localMouseY;
            const scaredDistance = Math.sqrt(
              petScaredDX * petScaredDX + petScaredDY * petScaredDY,
            );

            if (scaredDistance < 80) {
              // Trigger Startle Jump & Offsetting!
              state.mouse.startleCooldown = 180; // 3 seconds
              state.mouse.scaredTimer = 15; // 15 frames of wide open eyeScaleY

              p.vy = -6.5; // small vy bounce impulse
              const scaredDir = petScaredDX >= 0 ? 1 : -1;
              p.x += scaredDir * 40; // x-Versatz weg vom Zeiger
              p.vx = scaredDir * 4.0;
              p.targetX = p.x;
              p.targetY = floorY;

              // Star explosion feedback
              for (let k = 0; k < 6; k++) {
                state.particles.push({
                  x: p.x,
                  y: p.y - 15,
                  vx: (Math.random() - 0.5) * 6,
                  vy: -Math.random() * 5 - 2,
                  life: 0.8,
                  color: "#f87171",
                  type: "star",
                  sizeScale: 0.8,
                });
              }
            }
          }
        } else {
          state.mouse.stillTime = 0;
        }

        state.mouse.lastX = mouseX;
        state.mouse.lastY = mouseY;

        if (state.mouse.startleCooldown > 0) state.mouse.startleCooldown--;
        if (state.mouse.scaredTimer > 0) state.mouse.scaredTimer--;

        // --- CHASE MODES DECIDER ---
        const hasToy = state.toys.length > 0 && behaviorMode !== "sleep";
        const activeToy = hasToy ? state.toys[0] : null;

        if (isDraggingPet) {
          // Bypass update logic during drag
          p.wanderTimer = Math.max(10, p.wanderTimer);
        } else if (p.isHanging) {
          // Hang from ceiling
          p.x += (p.targetX - p.x) * 0.1;
          p.y = 35;
          p.vx = 0;
          p.vy = 0;
          p.legSwingAngle = Math.sin(time * 1.8) * 0.35;

          if (Math.random() < 0.02) {
            state.particles.push({
              x: p.x,
              y: p.y + 12,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 0.8 + Math.random() * 0.8,
              life: 1.0,
              color: "#fbbf24",
              emoji: "🎵",
              type: "note",
            });
          }

          const hasFoodDropped = state.food.length > 0;
          if (hasFoodDropped || Math.random() < 0.003) {
            p.isHanging = false;
            p.vy = 1.5; // fall
            p.vx = (Math.random() - 0.5) * 3;
          }
        } else {
          if (state.food.length > 0 && behaviorMode !== "sleep") {
            const target = state.food[0];
            if (p.x < target.x) p.vx += 0.4;
            if (p.x > target.x) p.vx -= 0.4;
          } else if (activeToy && behaviorMode !== "sleep") {
            // EXTRA GUSTO TO CHASE BOUNCING SPORT TOYS!
            if (p.x < activeToy.x - 12) p.vx += 0.45;
            else if (p.x > activeToy.x + 12) p.vx -= 0.45;

            // Leap up if the ball flies high!
            if (
              p.y >= floorY - 5 &&
              activeToy.y < floorY - 40 &&
              Math.random() < 0.08
            ) {
              queueJump(-5.0 - Math.random() * 3.5, 22);
            }
          } else {
            const localMouseX = mouseX - rect.left;
            const localMouseY = mouseY - rect.top;
            const petMouseDX = localMouseX - p.x;
            const petMouseDXAbs = Math.abs(petMouseDX);

            const nowTime = Date.now();
            const timeSinceLeave = nowTime - (state.mouse.leaveTime || 0);
            const hasLeftMoreThan2s =
              !state.mouse.isOver && timeSinceLeave > 2000;
            const isMouseActive = state.mouse.isOver && !hasLeftMoreThan2s;

            let isApproachingCuriously = false;

            if (
              behaviorMode !== "sleep" &&
              !isDraggingPet &&
              isMouseActive &&
              state.mouse.stillTime > 2.0 &&
              petMouseDXAbs >= 80 &&
              petMouseDXAbs <= 250 &&
              !isPauseTimerRunningRef.current &&
              !isLärmampelActive
            ) {
              isApproachingCuriously = true;
              // Trottet neugierig heran (halbes Wandertempo of Wander mode: 0.14)
              // Stoppt bei ~50px
              const tOffsetX = petMouseDX > 0 ? 50 : -50;
              p.targetX = localMouseX - tOffsetX;
              p.targetY = floorY;

              const travelDX = p.targetX - p.x;
              if (Math.abs(travelDX) > 8) {
                p.vx += Math.sign(travelDX) * 0.14; // half target speed (0.14)
              } else {
                p.vx = 0;
                p.targetX = p.x;
                if (!state.idleAction) {
                  state.idleAction = { typ: "umschauen", frame: 0, dauer: 90 };
                }
              }
            }

            if (isApproachingCuriously) {
              // already updated, skip default state decisions
            } else if (behaviorMode === "sleep") {
              p.vx = 0; // stop moving
              if (Math.random() < 0.025) {
                state.particles.push({
                  x: p.x + 10,
                  y: p.y - 30,
                  vx: 0.4 + Math.random() * 0.4,
                  vy: -1.2,
                  life: 1.0,
                  color: "#cbd5e1",
                  emoji: "Z",
                  type: "zzz",
                  sizeScale: 0.8 + Math.random() * 0.5,
                });
              }
            } else if (isPauseTimerRunningRef.current) {
              // PARTICIPATE IN FLITZIPAUSE! Dance, jump and celebrate the active break!
              p.vx *= 0.5; // stay centered-ish and move around and jump
              if (p.y >= floorY - 5) {
                queueJump(-6.0 - Math.random() * 3.5, 25);

                // Fun action workout sparks & runners
                const breakEmojis = ["🏃", "⚡", "✨", "🔥", "🎉"];
                state.particles.push({
                  x: p.x,
                  y: p.y - 15,
                  vx: (Math.random() - 0.5) * 6,
                  vy: -Math.random() * 4 - 3,
                  life: 0.85,
                  color: ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"][
                    Math.floor(Math.random() * 4)
                  ],
                  emoji:
                    breakEmojis[Math.floor(Math.random() * breakEmojis.length)],
                  type: "default",
                  sizeScale: 0.8 + Math.random() * 0.4,
                });
              }
            } else if (isLärmampelActive || behaviorMode === "quiet") {
              // BE FLÜSTERLEISE DURING LÄRMAMPEL OR QUIET MODE! Sit quiet, move extra slowly, and shush gently
              p.vx *= 0.55; // damp movements
              if (Math.random() < 0.008) {
                state.particles.push({
                  x: p.x + 8,
                  y: p.y - 25,
                  vx: (Math.random() - 0.5) * 0.8,
                  vy: -0.8,
                  life: 0.9,
                  color: "#22d3ee",
                  emoji: "🤫",
                  type: "default",
                  sizeScale: 0.85,
                });
              }
            } else if (behaviorMode === "learn") {
              const cx = rect.width / 2;
              if (p.x < cx - 10) p.vx += 0.1;
              if (p.x > cx + 10) p.vx -= 0.1;
              if (Math.random() < 0.015) {
                state.particles.push({
                  x: p.x + 15,
                  y: p.y - 25,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -1.2,
                  life: 1.0,
                  color: "#facc15",
                  emoji: "💡",
                  type: "default",
                  sizeScale: 0.9 + Math.random() * 0.4,
                });
              }
            } else if (behaviorMode === "idle") {
              p.targetX = rect.width / 2;
              const dist = p.targetX - p.x;
              if (Math.abs(dist) > 2) {
                p.vx += Math.sign(dist) * 0.15;
              }
            } else {
              // wander - more active movement with climbing along edges
              if (p.wanderTimer <= 0) {
                const rand = Math.random();
                const calmFactor = isCalmActive ? 0.3 : 1.0;

                if (rand < 0.5) {
                  // Wander along bottom
                  p.targetWall = "bottom";
                  p.targetX = 40 + Math.random() * (rect.width - 80);
                  p.targetY = floorY;
                } else if (rand < 0.65 * calmFactor) {
                  // Reduced vertical movement if calm
                  // Wander up left wall
                  p.targetWall = "left";
                  p.targetX = 30;
                  p.targetY = 40 + Math.random() * (floorY - 80);
                } else if (rand < 0.8 * calmFactor) {
                  // Reduced vertical movement if calm
                  // Wander up right wall
                  p.targetWall = "right";
                  p.targetX = rect.width - 30;
                  p.targetY = 40 + Math.random() * (floorY - 80);
                } else if (rand < 0.95 * calmFactor && platforms.length > 0) {
                  // Wander to a random widget roof!
                  const randomPf =
                    platforms[Math.floor(Math.random() * platforms.length)];
                  p.targetWall = "bottom"; // treats platform top as bottom
                  p.targetX =
                    randomPf.left +
                    Math.random() * (randomPf.right - randomPf.left);
                  p.targetY = randomPf.top;
                } else {
                  p.targetWall = "bottom";
                  p.targetX = p.x;
                  p.targetY = floorY;
                }
                p.wanderTimer =
                  (100 + Math.random() * 150) * (isCalmActive ? 2 : 1);

                // Randomly decide to jump if on bottom (NEVER if calm)
                if (
                  !isCalmActive &&
                  (!p.currentWall || p.currentWall === "bottom") &&
                  Math.random() > 0.6 &&
                  p.y >= floorY - 5
                ) {
                  queueJump(-4.5 - Math.random() * 3.5, 0);
                }
                // Randomly jump high to grab ceiling! (Fledermaus)
                if (
                  !isCalmActive &&
                  Math.random() < 0.06 &&
                  p.y >= floorY - 5
                ) {
                  queueJump(-14.0 - Math.random() * 3.0, 0);
                  p.vx = (Math.random() - 0.5) * 6;
                }
              } else {
                p.wanderTimer--;
              }

              // Movement logic towards target (allowing X and Y)
              const dx = p.targetX - p.x;
              const dy = p.targetY - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              const hasIdleAction = stateRef.current.idleAction !== null;
              const hasJumpQueue = stateRef.current.jumpQueue !== null;
              if (hasIdleAction || hasJumpQueue) {
                p.vx = 0;
                p.vy = 0;
              } else {
                if (dist > 5) {
                  const speed =
                    behaviorMode === "wander" || behaviorMode === "auto"
                      ? 0.28
                      : isCalmActive
                        ? 0.1
                        : 0.75;
                  p.vx += (dx / (dist || 1)) * speed;
                  p.vy += (dy / (dist || 1)) * speed;
                }
              }

              // Transition between walls
              if (p.x < 45 && p.targetWall === "left") p.currentWall = "left";
              else if (p.x > rect.width - 45 && p.targetWall === "right")
                p.currentWall = "right";
              else if (p.y > floorY - 15) p.currentWall = "bottom";
            }
          }
        }

        const isClimbing =
          p.currentWall === "left" || p.currentWall === "right";

        // --- HIGH FALL PARACHUTE TRIGGER ---
        if (
          p.vy > 4.5 &&
          p.y < floorY - 110 &&
          !p.isHanging &&
          !isDraggingPet &&
          !isClimbing
        ) {
          p.isParachuteOpen = true;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Apply friction and gravity
        const friction = isClimbing ? 0.82 : 0.85;
        p.vx *= friction;

        if (p.isParachuteOpen) {
          p.vy = Math.min(1.6, p.vy); // secure gliding fall speed
          p.vx += Math.sin(time * 2.5) * 0.2;
        } else {
          p.vy *= isClimbing ? 0.82 : 0.95;
        }

        // Gravity only if not sticking to a side wall or if falling
        if (
          !isClimbing &&
          behaviorMode !== "sleep" &&
          !p.isHanging &&
          !isDraggingPet
        ) {
          p.vy += 0.52;
        }

        // --- PLATFORM SURFACE STANDING AND COLLISION ---
        let standingOnPlatform = null;
        if (!isClimbing && !isDraggingPet && !p.isHanging && p.vy >= 0) {
          platforms.forEach((pf) => {
            if (p.x >= pf.left - 12 && p.x <= pf.right + 12) {
              if (p.y >= pf.top - 8 && p.y <= pf.top + 14) {
                standingOnPlatform = pf;
              }
            }
          });
        }

        let currentFloorY = floorY;
        if (standingOnPlatform) {
          p.currentPlatform = standingOnPlatform;
          currentFloorY = standingOnPlatform.top;
          p.y = currentFloorY;
          p.vy = 0;
          p.isParachuteOpen = false;
        } else if (p.currentPlatform) {
          const pf = p.currentPlatform;
          // Verify platform still exists
          const activePf = platforms.find(
            (x) =>
              Math.abs(x.left - pf.left) < 5 && Math.abs(x.top - pf.top) < 5,
          );
          if (activePf) {
            if (p.x < activePf.left - 12 || p.x > activePf.right + 12) {
              p.currentPlatform = null; // walked off!
            } else {
              currentFloorY = activePf.top;
              p.y = currentFloorY;
              p.vy = 0;
              p.isParachuteOpen = false;
            }
          } else {
            p.currentPlatform = null;
          }
        }

        // Keep track of airborne state & landing bounces
        const isCurrentlyAirborne =
          p.y < (isClimbing ? -1000 : currentFloorY - 2);
        if (!isCurrentlyAirborne && p.prevAirborne) {
          // Hitting the floor/platform! Trigger squishy pudding feedback bounce
          p.landBounceValue = 1.0;
          stateRef.current.landTimer = 10; // 10 frames of decaying spring oscillation
          p.prevAirborne = false;
          p.isSalto = false;
          p.saltoAngle = 0;

          // If parachute closed by landing, spawn visual wind blow indicators
          if (p.isParachuteOpen) {
            p.isParachuteOpen = false;
          }
          // Spawn landing dust rings!
          for (let j = 0; j < 6; j++) {
            state.particles.push({
              x: p.x + (j - 2.5) * 6,
              y: currentFloorY,
              vx: (j - 2.5) * 0.7,
              vy: -0.5 - Math.random() * 0.5,
              life: 0.6,
              color: "rgba(255, 255, 255, 0.4)",
              emoji: "",
              type: "crumb",
            });
          }
        }
        if (isCurrentlyAirborne) {
          p.prevAirborne = true;
          if (p.isSalto) {
            p.saltoAngle += 0.22; // clockwise full flip (~6.28 radians) during jump arc
            if (p.saltoAngle > Math.PI * 2) {
              p.saltoAngle = Math.PI * 2;
            }
          }
        }

        // Decay landing impact bounce factor
        if (p.landBounceValue > 0) {
          p.landBounceValue *= 0.82;
        }

        // --- CEILING HANG OVERRIDE ---
        if (
          p.vy < 0 &&
          p.y <= 45 &&
          !isClimbing &&
          !isDraggingPet &&
          behaviorMode !== "sleep"
        ) {
          p.isHanging = true;
          p.isParachuteOpen = false;
          p.y = 35;
          p.vy = 0;
          p.vx = 0;
        }

        // --- SKIDDING TRACTION FRICTION ---
        if (Math.abs(p.vx) > 3.0 && p.y >= currentFloorY - 5) {
          p.isSkidding = true;
          if (Math.random() < 0.25) {
            state.particles.push({
              x: p.x - Math.sign(p.vx) * 12,
              y: currentFloorY,
              vx: -Math.sign(p.vx) * (1.2 + Math.random() * 1.5),
              vy: -0.4 - Math.random() * 0.6,
              life: 0.5,
              color: "rgba(230, 230, 230, 0.4)",
              type: "crumb",
            });
          }
        } else {
          if (p.isSkidding) {
            p.isSkidding = false;
          }
        }

        // --- HIGH FIVE EVENT TRIGGERS AT SCHÜLERLISTE ---
        if (p.currentWall === "left") {
          if (
            Math.random() < 0.008 &&
            (!p.highFiveTimer || p.highFiveTimer <= 0)
          ) {
            p.highFiveTimer = 60;
            const highFiveEvent = new CustomEvent("pet-high-five", {
              detail: { y: p.y, x: p.x },
            });
            window.dispatchEvent(highFiveEvent);

            // Pop glowing high five gold stars
            for (let s = 0; s < 10; s++) {
              state.particles.push({
                x: p.x + 8,
                y: p.y - 12,
                vx: 1.5 + Math.random() * 2.5,
                vy: (Math.random() - 0.5) * 4.0,
                life: 0.9,
                color: "#fbbf24",
                emoji: "✨",
                type: "default",
                sizeScale: 0.75,
              });
            }
          }
        }
        if (p.highFiveTimer && p.highFiveTimer > 0) {
          p.highFiveTimer--;
        }

        // Strict out of bounds enforcement with unified check
        const xMargin = size * 1.5; // Increased margin for safety
        const yMargin = size * 1.0;

        if (p.x < xMargin) {
          p.x = xMargin;
          const isWallHit = Math.abs(p.vx) > 5.5;
          p.vx = Math.abs(p.vx) * 0.4; // bounce inward
          if (p.targetWall === "left") {
            // allow staying on wall
          } else {
            p.targetX = xMargin + 20;
          }

          if (isWallHit) {
            p.dizzyTimer = 90; // Dizzy for 1.5 seconds!
            p.landBounceValue = 0.8;
            // sparks
            for (let i = 0; i < 5; i++) {
              state.particles.push({
                x: p.x,
                y: p.y - 15,
                vx: 1 + Math.random() * 3,
                vy: (Math.random() - 0.5) * 4,
                life: 0.6,
                color: "#ef4444",
                emoji: "💥",
                type: "default",
                sizeScale: 0.7,
              });
            }
          }
        }
        if (p.x > rect.width - xMargin) {
          p.x = rect.width - xMargin;
          const isWallHit = Math.abs(p.vx) > 5.5;
          p.vx = -Math.abs(p.vx) * 0.4; // bounce inward
          if (p.targetWall === "right") {
            // allow staying on wall
          } else {
            p.targetX = rect.width - xMargin - 20;
          }

          if (isWallHit) {
            p.dizzyTimer = 90; // Dizzy for 1.5 seconds!
            p.landBounceValue = 0.8;
            for (let i = 0; i < 5; i++) {
              state.particles.push({
                x: p.x,
                y: p.y - 15,
                vx: -1 - Math.random() * 3,
                vy: (Math.random() - 0.5) * 4,
                life: 0.6,
                color: "#ef4444",
                emoji: "💥",
                type: "default",
                sizeScale: 0.7,
              });
            }
          }
        }

        if (p.y < yMargin) {
          p.y = yMargin;
          p.vy = Math.abs(p.vy) * 0.4;
        }

        if (p.y > currentFloorY) {
          p.y = currentFloorY;
          p.vy = 0;
          if (p.targetY > currentFloorY) p.targetY = currentFloorY;
        }

        if (p.bounceTimer > 0) p.bounceTimer--;
        if (p.wagTimer > 0) p.wagTimer--;
        if (p.headTiltTimer > 0) p.headTiltTimer--;
        if (p.stretchTimer > 0) p.stretchTimer--;

        // Update secondary physics (ears and tail) based on movement & timers
        const targetEarLag = p.vx * -0.05 + p.vy * -0.02;
        state.earLag += (targetEarLag - state.earLag) * 0.2;

        let targetTailLag = p.vx * -0.08;
        if (p.wagTimer > 0) {
          targetTailLag = Math.sin(time * 18.0) * 0.8;
        } else if (state.idleAction?.typ === "wedeln") {
          targetTailLag = Math.sin(time * 3.5) * 0.3;
        }
        state.tailLag += (targetTailLag - state.tailLag) * 0.3;

        // Food Physics and Feeding Particle Triggering
        for (let i = state.food.length - 1; i >= 0; i--) {
          const f = state.food[i];
          f.y += f.vy;
          f.vy += 0.15;

          const isOnFloor = f.y >= rect.height - 25;
          if (isOnFloor) {
            f.y = rect.height - 25;
            f.vy = 0; // stop bouncing / moving down on the floor
            if (f.alpha === undefined) f.alpha = 1.0;
            f.alpha -= 0.04; // Fade out quickly over ~25 frames (~400ms)
          }

          if (f.alpha !== undefined && f.alpha <= 0) {
            state.food.splice(i, 1);
            continue;
          }

          const dx = p.x - f.x;
          const dy = p.y - 15 - f.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 45) {
            state.food.splice(i, 1);
            queueJump(-6.0, 25);

            // High fidelity thematic bursts
            let particleType:
              | "wind"
              | "crumb"
              | "star"
              | "heart"
              | "note"
              | "zzz"
              | "default" = "default";
            let colors = ["#fde047", "#34d399", "#60a5fa", "#f472b6"];
            let customEmojiArr: string[] = [];

            if (f.emoji === "🍃") {
              particleType = "wind";
              colors = ["#bae6fd", "#e0f2fe", "#7dd3fc", "#bae6fd"];
            } else if (f.emoji === "🍪") {
              particleType = "crumb";
              colors = ["#d97706", "#b45309", "#f59e0b", "#78350f"];
            } else if (f.emoji === "⭐" || f.emoji === "✨") {
              particleType = "star";
              colors = ["#facc15", "#fde047", "#fbbf24", "#fef08a"];
              customEmojiArr = ["✨", "⭐"];
            } else if (f.emoji === "💖") {
              particleType = "heart";
              colors = ["#ec4899", "#f472b6", "#f43f5e", "#fda4af"];
              customEmojiArr = ["💖", "❤️", "💝"];
            } else if (f.emoji === "🎵") {
              particleType = "note";
              colors = ["#a855f7", "#d946ef", "#f43f5e", "#6366f1", "#3b82f6"];
              customEmojiArr = ["🎵", "🎶", "🎷"];
            }

            for (let j = 0; j < 18; j++) {
              state.particles.push({
                x: p.x,
                y: p.y - 20,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 9 - 1,
                life: 1.0,
                color: colors[Math.floor(Math.random() * colors.length)],
                emoji:
                  customEmojiArr.length > 0
                    ? customEmojiArr[
                        Math.floor(Math.random() * customEmojiArr.length)
                      ]
                    : undefined,
                type: particleType,
                angle: Math.random() * Math.PI * 2,
                sizeScale: 0.75 + Math.random() * 0.7,
              });
            }
          }
        }

        // Global Happy Event Particles
        const tMit = (window as any).__lastMitarbeitPlusTime || 0;
        const tSup = (window as any).__lastVerhaltenSuperTime || 0;
        const lastHappy = Math.max(tMit, tSup);
        const lastProcessed = Math.max(
          (window as any).__lastProcessedHappyTime || 0,
          Math.max(
            (window as any).__lastVerhaltenDownTime || 0,
            (window as any).__lastNoiseVolume ? Date.now() - 1000 : 0,
          ),
        ); // Don't retroactively process old ones on mount

        if (
          lastHappy > ((window as any).__lastProcessedHappyTime || 0) &&
          Date.now() - lastHappy < 2000 &&
          Date.now() - lastHappy >= 1000
        ) {
          (window as any).__lastProcessedHappyTime = lastHappy;

          // Spawn hearts and confetti explosion!
          for (let i = 0; i < 35; i++) {
            state.particles.push({
              x: p.x + (Math.random() - 0.5) * 60,
              y: p.y - 30 + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 12,
              vy: -Math.random() * 8 - 4,
              life: 1.0,
              color: `hsl(${Math.random() * 360}, 85%, 65%)`,
              type: Math.random() > 0.4 ? "confetti" : "heart",
              emoji:
                Math.random() > 0.5 ? "💖" : Math.random() > 0.5 ? "🎊" : "✨",
              angle: Math.random() * Math.PI * 2,
            });
          }
        }

        // Update Particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const pt = state.particles[i];

          if (pt.type === "wind") {
            pt.x += pt.vx + Math.sin(time * 3 + pt.y * 0.05) * 1.5;
            pt.y += pt.vy - 0.7; // fresh air currents floating up
            pt.vx *= 0.97;
          } else if (pt.type === "crumb") {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.3; // gravity
            // Bounce on floorY
            const maxCrumbY = floorY + 8;
            if (pt.y >= maxCrumbY) {
              pt.y = maxCrumbY;
              const bCount = (pt as any).bounces ?? 0;
              if (bCount < 1) {
                pt.vy = -pt.vy * 0.4; // 40% bounce
                pt.vx *= 0.6; // slow down horizontally
                (pt as any).bounces = 1;
              } else {
                pt.vy = 0;
                pt.vx = 0; // stop moving
              }
            }
          } else if (pt.type === "confetti") {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.25; // gravity
            pt.vx *= 0.98; // air resistance
            pt.vx += Math.sin(time * 0.15 + pt.y * 0.02) * 0.12; // side drift
            if (pt.angle !== undefined) {
              const rSpeed = (pt as any).rotSpeed ?? 0.15;
              pt.angle += rSpeed;
            }
          } else if (pt.type === "heart") {
            // rise with side-to-side wobble
            pt.x += pt.vx + Math.sin(pt.life * 12) * 1.5;
            pt.y += pt.vy - 0.7;
          } else if (pt.type === "note") {
            pt.x += pt.vx + Math.cos(time * 4) * 0.9;
            pt.y += pt.vy - 0.3;
            if (pt.angle !== undefined) {
              pt.angle += 0.06;
            }
          } else if (pt.type === "star") {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy *= 0.95;
            pt.vx *= 0.95;
          } else if (pt.type === "zzz") {
            // rise, drift right
            pt.x += 0.45;
            pt.y -= 0.65;
          } else if (pt.type === "snow") {
            pt.x += pt.vx + Math.sin(time + pt.y * 0.05) * 0.4;
            pt.y += pt.vy;
          } else if (pt.type === "leaf") {
            pt.x += pt.vx + Math.sin(time * 0.8 + pt.y * 0.02) * 1.25;
            pt.y += pt.vy;
          } else if (pt.type === "blossom") {
            pt.x += pt.vx + Math.cos(time + pt.y * 0.04) * 0.8;
            pt.y += pt.vy;
          } else {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.15;
          }

          pt.life -= 0.016;
          if (pt.life <= 0) state.particles.splice(i, 1);
        }

        // Render Food Emojis
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font =
          '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        state.food.forEach((f) => {
          ctx.save();
          if (f.alpha !== undefined) {
            ctx.globalAlpha = f.alpha;
          }
          ctx.fillText(f.emoji, f.x, f.y);
          ctx.restore();
        });

        // Render Schlafzuhause Back behind the pet shadow
        const homeX = rect.width / 2;
        const homeStyle = homeStyleRef.current || "basket";
        if (behaviorMode === "sleep") {
          drawHomeBack(ctx, homeX, floorY, homeStyle);
        }

        // --- KLASSENSTIMMUNGS-AURA (CLASS MOOD GLOW) ---
        const isNoiseAlarm = (window as any).__isNoiseAlarm || false;

        // Decide Class Mood
        let auraColorActive = "rgba(16, 185, 129, "; // emerald green
        let glowRadiusFactor = 1.0;
        let auraIntensity =
          0.32 +
          Math.sin(time * (isCalmActive ? 1.5 : 3.5)) *
            (isCalmActive ? 0.04 : 0.12);

        // Only draw the aura when in wakeful mode
        if (behaviorMode !== "sleep") {
          if (isNoiseAlarm || noiseVol >= noiseThresh) {
            // LOUD / RESET FLASHING RED
            const pulseFlashOn = Math.sin(time * 8.0) > 0;
            auraColorActive = pulseFlashOn
              ? "rgba(239, 68, 68, "
              : "rgba(185, 28, 28, ";
            glowRadiusFactor = 1.35 + Math.sin(time * 10) * 0.22;
            auraIntensity = 0.55 + Math.random() * 0.25;
          } else if (noiseVol >= noiseThresh * 0.5) {
            // WARNING CONCENTRATED YELLOW
            auraColorActive = "rgba(245, 158, 11, "; // amber yellow
            glowRadiusFactor = 1.1 + Math.sin(time * 5.0) * 0.08;
            auraIntensity = 0.42 + Math.sin(time * 4.5) * 0.1;
          } else {
            // QUIET COZY CALM EMERALD GREEN
            auraColorActive = "rgba(34, 197, 94, ";
            glowRadiusFactor =
              0.95 +
              Math.sin(time * (isCalmActive ? 0.8 : 1.8)) *
                (isCalmActive ? 0.02 : 0.05);
            auraIntensity =
              0.28 +
              Math.sin(time * (isCalmActive ? 1.0 : 2.0)) *
                (isCalmActive ? 0.02 : 0.06);
          }

          ctx.save();
          const hFactor = Math.max(0, 1 - (floorY - p.y) / 120);
          const petGlowRadius = size * 2.4 * glowRadiusFactor * hFactor;
          const auraGrad = ctx.createRadialGradient(
            p.x,
            p.y - 12,
            size * 0.2,
            p.x,
            p.y - 12,
            petGlowRadius,
          );
          auraGrad.addColorStop(0, auraColorActive + auraIntensity + ")");
          auraGrad.addColorStop(
            0.3,
            auraColorActive + auraIntensity * 0.5 + ")",
          );
          auraGrad.addColorStop(
            0.7,
            auraColorActive + auraIntensity * 0.15 + ")",
          );
          auraGrad.addColorStop(1, auraColorActive + "0)");

          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 12, petGlowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Render Ground Contact Shadow (Schatten verjüngt/schwächt bei Höhenflügen)
        const hFactor = Math.max(0, 1 - (floorY - p.y) / 120);
        ctx.save();
        const shadowGrad = ctx.createRadialGradient(
          p.x,
          floorY,
          0,
          p.x,
          floorY,
          size * 1.4,
        );
        shadowGrad.addColorStop(0, `rgba(15, 23, 42, ${0.43 * hFactor})`);
        shadowGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(
          p.x,
          floorY,
          size * 1.4 * hFactor,
          size * 0.3 * hFactor,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();

        // Compute current eye emotional layout
        let eyeMode: "normal" | "happy" | "sparkle" | "sleepy" | "sad" =
          "normal";
        const tDown = (window as any).__lastVerhaltenDownTime || 0;
        const tMitEyes = (window as any).__lastMitarbeitPlusTime || 0;
        const tSupEyes = (window as any).__lastVerhaltenSuperTime || 0;
        const isSad =
          tDown && Date.now() - tDown >= 1000 && Date.now() - tDown < 4000;
        const isHappy =
          (tMitEyes && Date.now() - tMitEyes < 3000) ||
          (tSupEyes &&
            Date.now() - tSupEyes >= 1000 &&
            Date.now() - tSupEyes < 4000);
        if (isSlidingDownRef.current) {
          eyeMode = "happy";
        } else if (isClimbingSidebarRef.current) {
          eyeMode = "sparkle";
        } else if (isSad) {
          eyeMode = "sad";
        } else if (isHappy) {
          eyeMode = "happy";
        } else if (behaviorMode === "sleep") {
          eyeMode = "sleepy";
        } else if (energy < 30) {
          eyeMode = "sleepy";
        } else if (p.bounceTimer > 0) {
          eyeMode = "happy";
        } else if (energy > 85) {
          eyeMode = "sparkle";
        }

        // Render Pet Group with cartoon squash and stretch physics
        ctx.save();
        ctx.translate(p.x, p.y);

        // Draw learning book on the ground next to pet (stable vector rendering, unaffected by squishy body breath)
        if (behaviorMode === "learn") {
          drawLearningBook(ctx, size);
        }

        if (isBirthday) {
          drawBirthdayCake(ctx, size, birthdayNames, time);
        }

        let scaleX = state.squashX;
        let scaleY = state.squashY;

        if (state.idleAction) {
          const act = state.idleAction;
          if (act.typ === "gaehnen") {
            const yawnPhase = Math.sin((act.frame / act.dauer) * Math.PI);
            scaleY += yawnPhase * 0.08;
            scaleX -= yawnPhase * 0.05;
          }
        }

        if (p.isScared) {
          scaleY = 0.65;
          scaleX = 1.35;
        }

        if (p.stretchTimer > 0) {
          const stretchPhase = Math.sin((p.stretchTimer / 90) * Math.PI);
          scaleY *= 1.0 + stretchPhase * 0.3;
          scaleX *= 1.0 - stretchPhase * 0.15;
        }

        ctx.scale(scaleX, scaleY);
        if (isSlidingDownRef.current && Math.random() < 0.35) {
          stateRef.current.particles.push({
            x: p.x + (Math.random() - 0.5) * 16,
            y: p.y + size * 0.4,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 2 - 1,
            life: 0.65,
            color: "rgba(255, 255, 255, 0.75)",
            type: "crumb",
          });
        }

        let targetRotation =
          p.currentWall === "left"
            ? Math.PI / 2
            : p.currentWall === "right"
              ? -Math.PI / 2
              : 0;
        if (isClimbingSidebarRef.current) {
          targetRotation = -Math.PI / 6;
        } else if (isSlidingDownRef.current) {
          targetRotation = Math.PI / 4;
        } else if (p.headTiltTimer > 0) {
          targetRotation = Math.sin(p.headTiltTimer * 0.1) * 0.25;
        }

        if (state.idleAction?.typ === "putzen") {
          targetRotation = Math.sin(time * 2.5) * 0.16; // Tilt left & right ~ ±0.16 rads
        } else if (state.idleAction?.typ === "wedeln") {
          targetRotation = Math.sin(time * 3.5) * 0.1; // gentle tails wagging tilt
        } else if (state.idleAction?.typ === "kopfneigen") {
          const act = state.idleAction;
          targetRotation = act.frame < act.dauer / 2 ? 0.25 : -0.2;
        }

        const rotationSpeed = isCalmActive ? 0.06 : 0.15;
        p.rotation += (targetRotation - p.rotation) * rotationSpeed;

        let stretchScaleY = 1.0;
        let stretchScaleX = 1.0;
        if (p.stretchTimer > 0) {
          const stretchPhase = Math.sin((p.stretchTimer / 90) * Math.PI);
          stretchScaleY = 1.0 + stretchPhase * 0.3;
          stretchScaleX = 1.0 - stretchPhase * 0.15;

          if (p.stretchTimer === 90) queueJump(-4, 0, false);
        }

        const petSize = size;

        // Render Parachute if open
        if (p.isParachuteOpen) {
          ctx.save();
          ctx.translate(0, -petSize * 1.15);

          // Strings
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.05;
          ctx.beginPath();
          ctx.moveTo(0, petSize);
          ctx.lineTo(-petSize * 1.5, -petSize * 1.1);
          ctx.moveTo(0, petSize);
          ctx.lineTo(petSize * 1.5, -petSize * 1.1);
          ctx.moveTo(0, petSize);
          ctx.lineTo(0, -petSize * 1.1);
          ctx.stroke();

          ctx.translate(0, -petSize * 1.1);

          // Canopy
          const canopyGrad = ctx.createLinearGradient(
            -petSize * 1.7,
            0,
            petSize * 1.7,
            0,
          );
          canopyGrad.addColorStop(0, "#ef4444");
          canopyGrad.addColorStop(0.33, "#eab308");
          canopyGrad.addColorStop(0.66, "#10b981");
          canopyGrad.addColorStop(1.0, "#3b82f6");
          ctx.fillStyle = canopyGrad;
          ctx.beginPath();
          ctx.arc(0, 0, petSize * 1.7, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();

          // Scallops
          ctx.fillStyle = "rgba(74, 85, 104, 0.95)";
          ctx.beginPath();
          const numScallops = 6;
          const scallopWidth = (petSize * 3.4) / numScallops;
          for (let s = 0; s <= numScallops; s++) {
            const sx = -petSize * 1.7 + s * scallopWidth;
            ctx.arc(
              sx + scallopWidth / 2,
              0,
              scallopWidth / 2,
              Math.PI,
              0,
              true,
            );
          }
          ctx.fill();

          ctx.restore();
        }

        if (behaviorMode === "sleep") {
          ctx.rotate(0);
        } else if (p.isHanging) {
          p.rotation = Math.PI + Math.sin(time * 1.8) * 0.15; // Upside down swing!
          ctx.rotate(p.rotation);
        } else {
          const saltoOffset = p.isSalto ? p.saltoAngle : 0;
          const speedLean = Math.max(-0.105, Math.min(0.105, p.vx * 0.06));
          ctx.rotate(p.rotation + speedLean + saltoOffset);
        }

        // Anchor pet bottom inside scale container
        ctx.translate(0, -petSize);

        // Draw feet walk cycle relative to speed (strictly quiet during study & sleep)
        const walkFactor = isClimbing
          ? Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          : Math.abs(p.vx);
        const isActuallyWalking =
          (isMovingRef.current !== undefined && isMovingRef.current !== false
            ? true
            : walkFactor > 0.02) &&
          behaviorMode !== "learn" &&
          behaviorMode !== "sleep";
        drawFeet(ctx, petSize, animalType, isActuallyWalking);

        // Invoke customized grad-rich animals with emotional eyes
        if (animalType === "cat")
          drawCat(
            ctx,
            petSize,
            eyeMode,
            stateRef.current.earLag,
            stateRef.current.tailLag,
          );
        else if (animalType === "dog")
          drawDog(
            ctx,
            petSize,
            eyeMode,
            stateRef.current.earLag,
            stateRef.current.tailLag,
          );
        else if (animalType === "owl") drawOwl(ctx, petSize, eyeMode);
        else if (animalType === "trax") drawTrax(ctx, petSize, eyeMode);
        else if (animalType === "dino") drawDino(ctx, petSize, eyeMode);
        else if (animalType === "frog") drawFrog(ctx, petSize, eyeMode);
        else if (animalType === "pig") drawPig(ctx, petSize, eyeMode);
        else if (animalType === "dobby") drawDobby(ctx, petSize, eyeMode, stateRef.current.earLag);
        else if (animalType === "unicorn") drawUnicorn(ctx, petSize, eyeMode);
        else if (animalType === "dragon") drawDragon(ctx, petSize, eyeMode);
        else if (animalType === "panda") drawPanda(ctx, petSize, eyeMode);
        else if (animalType === "pikachu") drawPikachu(ctx, petSize, eyeMode);
        else if (animalType === "axolotl") drawAxolotl(ctx, petSize, eyeMode);
        else if (animalType === "capybara") drawCapybara(ctx, petSize, eyeMode);
        else if (animalType === "shiba") drawShiba(ctx, petSize, eyeMode);
        else if (animalType === "totoro") drawTotoro(ctx, petSize, eyeMode);
        else if (animalType === "chopper") drawChopper(ctx, petSize, eyeMode);
        else if (animalType === "appa") drawAppa(ctx, petSize, eyeMode);
        else if (animalType === "grogu") drawGrogu(ctx, petSize, eyeMode);
        else if (animalType === "spongebob") drawSpongebob(ctx, petSize, eyeMode);
        else if (animalType === "patrick") drawPatrick(ctx, petSize, eyeMode);
        else if (animalType === "hello_kitty") drawHelloKitty(ctx, petSize, eyeMode);
        else if (animalType === "bluey") drawBluey(ctx, petSize, eyeMode);
        else if (animalType === "snoopy") drawSnoopy(ctx, petSize, eyeMode);
        else if (animalType === "garfield") drawGarfield(ctx, petSize, eyeMode);
        else
          drawCat(
            ctx,
            petSize,
            eyeMode,
            stateRef.current.earLag,
            stateRef.current.tailLag,
          ); // fallback

        // Render Dizzy Stars if dizzy
        if (p.isDizzy) {
          ctx.save();
          // Draw stars above pet
          ctx.translate(0, -petSize * 0.25);
          const numStars = 3;
          for (let i = 0; i < numStars; i++) {
            const starAngle = time * 5.0 + (i * Math.PI * 2) / numStars;
            const sx = Math.sin(starAngle) * (petSize * 0.7);
            const sy = Math.cos(starAngle) * (petSize * 0.2) - petSize * 0.9;
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            drawStar(ctx, sx, sy, petSize * 0.16);
            ctx.fill();
          }
          ctx.restore();
        }

        // Render Accessories
        accessories.forEach((accId) => {
          ctx.save();

          let yOffsetCrown = -1.1;
          let yOffsetParty = -1.2;
          let yOffsetWizard = -0.8;
          let yOffsetGlasses = -0.1;
          let yOffsetTie = 0.25;
          let xOffsetFlower = 0.65;
          let yOffsetFlower = -0.85;
          let xOffsetDetective = -0.8;
          let yOffsetDetective = 0.35;
          let scaleAcc = 0.7;
          let scaleGlasses = 0.8;

          if (animalType === "owl" || animalType === "trax") {
            yOffsetCrown = -1.25;
            yOffsetParty = -1.35;
            yOffsetWizard = -1.1;
            yOffsetGlasses = -0.2;
            yOffsetTie = 0.3;
            xOffsetFlower = 0.6;
            yOffsetFlower = -1.0;
            xOffsetDetective = -0.6;
            yOffsetDetective = 0.25;
            scaleGlasses = 0.9;
            scaleAcc = 0.8;
          } else if (animalType === "dino") {
            yOffsetCrown = -1.2;
            yOffsetParty = -1.35;
            yOffsetWizard = -1.1;
            yOffsetGlasses = -0.4;
            yOffsetTie = 0.15;
            xOffsetFlower = 0.8;
            yOffsetFlower = -1.1;
            xOffsetDetective = -0.9;
            yOffsetDetective = 0.2;
            scaleGlasses = 0.7;
            scaleAcc = 0.8;
          } else if (animalType === "frog") {
            yOffsetCrown = -0.85;
            yOffsetParty = -0.95;
            yOffsetWizard = -0.6;
            yOffsetGlasses = -0.6;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.7;
            xOffsetDetective = -0.85;
            yOffsetDetective = 0.45;
            scaleGlasses = 0.8;
            scaleAcc = 0.65;
          } else if (animalType === "cat") {
            yOffsetCrown = -1.15;
            yOffsetParty = -1.25;
            yOffsetWizard = -0.9;
            yOffsetGlasses = -0.15;
            yOffsetTie = 0.3;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.9;
            xOffsetDetective = -0.75;
            yOffsetDetective = 0.3;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "dog") {
            yOffsetCrown = -1.1;
            yOffsetParty = -1.2;
            yOffsetWizard = -0.9;
            yOffsetGlasses = -0.2;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.9;
            xOffsetDetective = -0.7;
            yOffsetDetective = 0.35;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "pig") {
            yOffsetCrown = -1.05;
            yOffsetParty = -1.15;
            yOffsetWizard = -0.8;
            yOffsetGlasses = -0.25;
            yOffsetTie = 0.3;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.8;
            xOffsetDetective = -0.7;
            yOffsetDetective = 0.4;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "dobby") {
            yOffsetCrown = -1.15;
            yOffsetParty = -1.25;
            yOffsetWizard = -0.9;
            yOffsetGlasses = -0.15;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.95;
            xOffsetDetective = -0.75;
            yOffsetDetective = 0.35;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "unicorn") {
            yOffsetCrown = -1.3; // adjusted higher due to horn
            yOffsetParty = -1.4;
            yOffsetWizard = -1.05;
            yOffsetGlasses = -0.2;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.95;
            xOffsetDetective = -0.75;
            yOffsetDetective = 0.35;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "dragon") {
            yOffsetCrown = -1.2;
            yOffsetParty = -1.3;
            yOffsetWizard = -0.95;
            yOffsetGlasses = -0.2;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.95;
            xOffsetDetective = -0.75;
            yOffsetDetective = 0.35;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          } else if (animalType === "panda" || animalType === "pikachu" || animalType === "axolotl" || animalType === "capybara" || animalType === "shiba" || animalType === "totoro" || animalType === "chopper" || animalType === "appa" || animalType === "grogu" || animalType === "spongebob" || animalType === "patrick" || animalType === "hello_kitty" || animalType === "bluey" || animalType === "snoopy" || animalType === "garfield") {
            yOffsetCrown = -1.15;
            yOffsetParty = -1.25;
            yOffsetWizard = -0.9;
            yOffsetGlasses = -0.15;
            yOffsetTie = 0.35;
            xOffsetFlower = 0.65;
            yOffsetFlower = -0.95;
            xOffsetDetective = -0.75;
            yOffsetDetective = 0.35;
            scaleGlasses = 0.85;
            scaleAcc = 0.75;
          }

          if (accId === "crown") {
            ctx.translate(0, petSize * yOffsetCrown);
            ctx.rotate(0.05 * Math.sin(time * 2));
            drawCrown(ctx, petSize * scaleAcc);
          } else if (accId === "party_hat") {
            ctx.translate(0, petSize * yOffsetParty);
            ctx.rotate(0.1);
            drawPartyHat(ctx, petSize * scaleAcc);
          } else if (accId === "wizard_hat") {
            ctx.translate(0, petSize * yOffsetWizard);
            ctx.rotate(-0.05);
            drawWizardHat(ctx, petSize * scaleAcc);
          } else if (accId === "glasses") {
            ctx.translate(0, petSize * yOffsetGlasses);
            drawGlasses(ctx, petSize * scaleGlasses);
          } else if (accId === "tie") {
            ctx.translate(0, petSize * yOffsetTie);
            drawTie(ctx, petSize * 0.95);
          } else if (accId === "flower") {
            ctx.translate(petSize * xOffsetFlower, petSize * yOffsetFlower);
            drawFlower(ctx, petSize * 0.55);
          } else if (accId === "headphones") {
            ctx.translate(0, petSize * -0.15); // Add headphones over ears
            // Headband
            ctx.beginPath();
            ctx.arc(0, 0, petSize * 1.05, Math.PI, 0, false);
            ctx.lineWidth = 14;
            ctx.strokeStyle = "#1e293b";
            ctx.stroke();
            // Ear cups
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.ellipse(
              -petSize * 1.05,
              5,
              petSize * 0.35,
              petSize * 0.55,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(
              petSize * 1.05,
              5,
              petSize * 0.35,
              petSize * 0.55,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            // Inner detail
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.ellipse(
              -petSize * 1.05,
              5,
              petSize * 0.2,
              petSize * 0.35,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(
              petSize * 1.05,
              5,
              petSize * 0.2,
              petSize * 0.35,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          } else if (accId === "calculator") {
            ctx.translate(petSize * 0.65, petSize * 0.15);
            ctx.rotate(Math.PI / 12);
            // Case
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(-15, -20, 30, 40);
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 2;
            ctx.strokeRect(-15, -20, 30, 40);
            // Screen
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(-11, -16, 22, 10);
            // Buttons
            ctx.fillStyle = "#334155";
            ctx.fillRect(-11, -1, 6, 6);
            ctx.fillRect(-3, -1, 6, 6);
            ctx.fillRect(5, -1, 6, 6);
            ctx.fillRect(-11, 7, 6, 6);
            ctx.fillRect(-3, 7, 6, 6);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(5, 7, 6, 14); // Equal
            ctx.fillStyle = "#334155";
            ctx.fillRect(-11, 15, 6, 6);
            ctx.fillRect(-3, 15, 6, 6);
          } else if (accId === "detective") {
            ctx.translate(
              petSize * xOffsetDetective,
              petSize * yOffsetDetective,
            );
            drawDetective(ctx, petSize * 0.85);
          }

          // --- AUTOMATIC SEASONAL DRESSING DECORATIONS ---
          const autoMonth = new Date().getMonth();
          const isHatAccActive =
            accId === "crown" ||
            accId === "party_hat" ||
            accId === "wizard_hat";

          if (
            !isHatAccActive &&
            (autoMonth === 11 || autoMonth === 0 || autoMonth === 1)
          ) {
            ctx.save();
            ctx.translate(0, petSize * yOffsetParty * 1.05);
            ctx.rotate(0.02 * Math.sin(time * 1.5));
            drawWinterHat(ctx, petSize * scaleAcc);
            ctx.restore();
          }

          ctx.restore();
        });

        ctx.restore();

        if (behaviorMode === "sleep") {
          drawHomeFront(ctx, homeX, floorY, homeStyle);
        }

        // --- RENDER PHYSICAL TOYS ---
        state.toys.forEach((toy) => {
          ctx.save();
          ctx.translate(toy.x, toy.y);
          ctx.rotate(toy.rotation);

          if (toy.type === "bubble") {
            ctx.beginPath();
            ctx.arc(0, 0, toy.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(186, 230, 253, 0.45)"; // Soft blue/cyan glass
            ctx.fill();

            ctx.beginPath();
            ctx.arc(
              -toy.radius * 0.3,
              -toy.radius * 0.3,
              toy.radius * 0.2,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fill();

            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (toy.type === "balloon") {
            ctx.beginPath();
            // Oval shape
            ctx.ellipse(0, 0, toy.radius, toy.radius * 1.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(239, 68, 68, 0.85)"; // Transparent red
            ctx.fill();

            // Highlight
            ctx.beginPath();
            ctx.ellipse(
              -toy.radius * 0.3,
              -toy.radius * 0.4,
              toy.radius * 0.2,
              toy.radius * 0.3,
              Math.PI / 4,
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fill();

            // Knot & String
            ctx.beginPath();
            ctx.moveTo(0, toy.radius * 1.2);
            ctx.lineTo(-3, toy.radius * 1.2 + 4);
            ctx.lineTo(3, toy.radius * 1.2 + 4);
            ctx.closePath();
            ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, toy.radius * 1.2 + 4);
            // String waving around
            ctx.quadraticCurveTo(5, toy.radius * 1.5, 0, toy.radius * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            ctx.font = "24px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let toyEmoji = "🪀";
            if (toy.type === "yarn") toyEmoji = "🧶";
            else if (toy.type === "feather") toyEmoji = "🪶";
            else if (toy.type === "ball") toyEmoji = "🥎";
            ctx.fillText(toyEmoji, 0, 0);
          }

          ctx.restore();
        });

        // Render Theme-Specific High Fidelity Particles
        state.particles.forEach((pt) => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.life);

          const pScale = pt.sizeScale || 1.0;

          if (pt.type === "wind") {
            ctx.strokeStyle = `rgba(186, 230, 253, ${pt.life})`;
            ctx.lineWidth = 3.5 * pt.life;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 9 * pScale * pt.life, 0, Math.PI * 1.35);
            ctx.stroke();
          } else if (pt.type === "crumb") {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(
              pt.x,
              pt.y,
              (1.8 + Math.random() * 2) * pt.life * pScale,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          } else if (pt.type === "note") {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.angle || 0);
            ctx.fillStyle = pt.color;
            ctx.font = `${13 * pScale}px sans-serif`;
            ctx.fillText(pt.emoji || "🎵", 0, 0);
            ctx.restore();
          } else if (pt.type === "star") {
            const age = 1.0 - pt.life;
            let flashAlpha = pt.life;
            if (age < 0.15) {
              flashAlpha = Math.sin(age * 50) > 0 ? 1.0 : 0.35;
            }
            ctx.globalAlpha = Math.max(0, flashAlpha);
            ctx.fillStyle = pt.color;
            ctx.save();
            ctx.translate(pt.x, pt.y);
            const pStarScale =
              (0.55 + Math.sin(time * 10 + pt.x) * 0.45) * pt.life * pScale;
            drawStar(ctx, 0, 0, 8.5 * pStarScale);
            ctx.restore();
          } else if (pt.type === "confetti") {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            if (pt.angle) ctx.rotate(pt.angle);
            ctx.fillStyle = pt.color;
            if (pt.emoji && Math.random() > 0.5) {
              ctx.font = `${(pt.emoji === "✨" ? 14 : 10) * pScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
              ctx.fillText(pt.emoji, 0, 0);
            } else {
              ctx.fillRect(-3, -3, 6, 6);
            }
            ctx.restore();
          } else if (pt.type === "heart") {
            ctx.fillStyle = pt.color;
            const ageRatio = 1.0 - pt.life;
            const growFactor = ageRatio < 0.25 ? ageRatio / 0.25 : 1.0;
            const currentSize = 13 * pScale * growFactor * pt.life;
            ctx.font = `${currentSize}px sans-serif`;
            ctx.fillText(pt.emoji || "💖", pt.x, pt.y);
          } else if (pt.type === "zzz") {
            ctx.fillStyle = pt.color;
            const ageRatio = 1.0 - pt.life;
            const zzzSize = (8 + ageRatio * 15) * pScale;
            ctx.font = `bold ${zzzSize}px "JetBrains Mono", monospace`;
            ctx.fillText(pt.emoji || "z", pt.x, pt.y);
          } else if (pt.type === "snow") {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.fillStyle = pt.color || "rgba(255, 255, 255, 0.85)";
            ctx.font = `${14 * pScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.fillText(pt.emoji || "❄️", 0, 0);
            ctx.restore();
          } else if (pt.type === "leaf") {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(time * 2.0);
            ctx.fillStyle = pt.color || "#f59e0b";
            ctx.font = `${15 * pScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.fillText(pt.emoji || "🍁", 0, 0);
            ctx.restore();
          } else if (pt.type === "blossom") {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(time * 1.2);
            ctx.fillStyle = pt.color || "#f472b6";
            ctx.font = `${14 * pScale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.fillText(pt.emoji || "🌸", 0, 0);
            ctx.restore();
            // Spacer dummy to swallow up the original font/fillText lines
            ctx.font = "1px sans-serif";
            ctx.fillStyle = "transparent";
          } else {
            if (pt.emoji) {
              ctx.font = `${11 + pt.life * 9}px sans-serif`;
              ctx.fillText(pt.emoji, pt.x, pt.y);
            } else {
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 3 * pt.life * pScale, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();
        animationFrameId = requestAnimationFrame(draw);
      };

      animationFrameId = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("keydown", handleGlobalKeyDown);
        window.removeEventListener("mousemove", handleMouseMove);
        resizeObserver.disconnect();

        if (canvas) {
          canvas.removeEventListener("mousedown", handleStart);
          canvas.removeEventListener("mousemove", handleMove);
          canvas.removeEventListener("mouseup", handleEnd);
          canvas.removeEventListener("touchstart", handleStart);
          canvas.removeEventListener("touchmove", handleMove);
          canvas.removeEventListener("touchend", handleEnd);
          canvas.removeEventListener("mouseenter", handleCanvasMouseEnter);
          canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
        }
      };
    }, [animalType, energy, accessories, behaviorMode, isWakingUp]);

    const typeLower = animalType.toLowerCase();
    let animationClass = "";
    if (
      typeLower.includes("owl") ||
      typeLower.includes("dragon") ||
      typeLower.includes("axolotl") ||
      typeLower.includes("unicorn") ||
      typeLower.includes("biene") ||
      typeLower.includes("bee")
    ) {
      animationClass = "animate-pet-float";
    } else if (
      typeLower.includes("fisch") ||
      typeLower.includes("fish") ||
      typeLower.includes("pinguin") ||
      typeLower.includes("penguin")
    ) {
      animationClass = "animate-pet-swing";
    } else {
      animationClass = "animate-pet-breathe";
    }

    return (
      <canvas
        ref={canvasRef}
        className={animationClass}
        style={{
          width,
          height: height === "100%" ? "150%" : height,
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          display: "block",
          cursor: "pointer",
          overflow: "visible",
          clipPath: "none",
        }}
      />
    );
  },
);
