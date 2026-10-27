import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { AssistantStatus } from "@/hooks/useVoiceAssistant";

const COLORS: Record<AssistantStatus, number> = {
  idle: 0x38bdf8,
  listening: 0x00e5ff,
  thinking: 0xa855f7,
  speaking: 0x34d399,
  tool: 0xfbbf24,
};
const PARAMS: Record<AssistantStatus, [number, number]> = {
  idle: [0.5, 0.05],
  listening: [0.9, 0.06],
  thinking: [1.7, 0.12],
  speaking: [1.1, 0.07],
  tool: [1.3, 0.09],
};

interface Props {
  status: AssistantStatus;
  getLevel: () => number;
  onClick?: () => void;
  className?: string;
}

export function Orb({ status, getLevel, onClick, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  const levelFn = useRef(getLevel);
  statusRef.current = status;
  levelFn.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.1;

    const color = new THREE.Color(COLORS.idle);
    const target = new THREE.Color(COLORS.idle);

    const geo = new THREE.IcosahedronGeometry(1, 4);
    const base = geo.attributes.position.array.slice() as Float32Array;
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.92 }),
    );
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4, 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
    );
    scene.add(mesh, core);

    const resize = () => {
      const s = canvas.parentElement?.clientWidth || 160;
      renderer.setSize(s, s, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    let level = 0;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = performance.now() * 0.001;
      const st = statusRef.current;
      const [speed, amp] = PARAMS[st];
      target.set(COLORS[st]);
      level += (levelFn.current() - level) * 0.15;

      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const k = i * 3;
        const x = base[k], y = base[k + 1], z = base[k + 2];
        const len = Math.hypot(x, y, z) || 1;
        const nx = x / len, ny = y / len, nz = z / len;
        const noise = Math.sin(nx * 3 + t * speed) * Math.cos(ny * 3 + t * speed * 0.8) * Math.sin(nz * 3 + t * speed * 0.6);
        const r = 1 + noise * amp + level * 0.32;
        pos.array[k] = nx * r;
        pos.array[k + 1] = ny * r;
        pos.array[k + 2] = nz * r;
      }
      pos.needsUpdate = true;
      mesh.rotation.y += 0.0022 + level * 0.01;
      mesh.rotation.x += 0.0011;
      core.scale.setScalar(1 + level * 0.6 + Math.sin(t * 2) * 0.04);
      color.lerp(target, 0.06);
      (mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      (core.material as THREE.MeshBasicMaterial).color.copy(color);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      core.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  const ring: Record<AssistantStatus, string> = {
    idle: "border-sky-400/30 shadow-[0_0_30px_rgba(56,189,248,0.18)]",
    listening: "border-cyan-300/60 shadow-[0_0_40px_rgba(0,229,255,0.35)]",
    thinking: "border-violet/60 shadow-[0_0_40px_rgba(168,85,247,0.35)]",
    speaking: "border-emerald/60 shadow-[0_0_40px_rgba(52,211,153,0.35)]",
    tool: "border-amber/60 shadow-[0_0_40px_rgba(251,191,36,0.35)]",
  };

  return (
    <button
      type="button"
      aria-label="V.A.D."
      onClick={onClick}
      className={`relative aspect-square rounded-full border bg-black/30 transition-all duration-500 ${ring[status]} ${className ?? ""}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </button>
  );
}
