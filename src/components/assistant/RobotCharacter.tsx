// DASOMTMFX - Colorful 3D AI Robot Character (Vibrant Premium)
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

export type RobotState = "idle" | "listening" | "thinking" | "speaking" | "alert" | "success" | "warning";

interface RobotProps {
  state: RobotState;
  signalDirection?: "BUY" | "SELL" | null;
}

// Vibrant multi-color palette per state
const stateColors: Record<RobotState, { primary: string; secondary: string; accent: string }> = {
  idle: { primary: "#00e5ff", secondary: "#7c4dff", accent: "#00e676" },
  listening: { primary: "#448aff", secondary: "#00e5ff", accent: "#18ffff" },
  thinking: { primary: "#d500f9", secondary: "#651fff", accent: "#00b0ff" },
  speaking: { primary: "#00e5ff", secondary: "#76ff03", accent: "#ffea00" },
  alert: { primary: "#ff9100", secondary: "#ff1744", accent: "#ffea00" },
  success: { primary: "#00e676", secondary: "#00e5ff", accent: "#76ff03" },
  warning: { primary: "#ff1744", secondary: "#ff9100", accent: "#ffea00" },
};

function RobotBody({ state, signalDirection }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Mesh>(null!);
  const visorRef = useRef<THREE.Mesh>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const antennaRef = useRef<THREE.Mesh>(null!);
  const chestCoreRef = useRef<THREE.Mesh>(null!);

  const palette = useMemo(() => {
    if (signalDirection === "BUY") return { primary: "#00e676", secondary: "#00e5ff", accent: "#76ff03" };
    if (signalDirection === "SELL") return { primary: "#ff1744", secondary: "#ff9100", accent: "#ffea00" };
    return stateColors[state];
  }, [state, signalDirection]);

  const c1 = useMemo(() => new THREE.Color(palette.primary), [palette]);
  const c2 = useMemo(() => new THREE.Color(palette.secondary), [palette]);
  const c3 = useMemo(() => new THREE.Color(palette.accent), [palette]);

  // Colorful body panels instead of dark grey
  const bodyPrimary = useMemo(() => new THREE.Color("#1a237e"), []); // deep indigo
  const bodySecondary = useMemo(() => new THREE.Color("#283593"), []); // lighter indigo
  const armorCyan = useMemo(() => new THREE.Color("#006064"), []); // teal armor
  const armorPurple = useMemo(() => new THREE.Color("#4a148c"), []); // purple armor

  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.05;
    }

    if (headRef.current) {
      const headSpeed = state === "listening" ? 2.5 : state === "thinking" ? 3 : 0.8;
      headRef.current.rotation.y = Math.sin(t * headSpeed) * (state === "thinking" ? 0.2 : 0.1);
      headRef.current.rotation.x = Math.sin(t * 0.5) * 0.04;
    }

    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      const pulseSpeed = state === "alert" ? 5 : state === "thinking" ? 3.5 : 1.8;
      mat.emissiveIntensity = state === "alert" ? 4 + Math.sin(t * pulseSpeed) * 3 : 2.5 + Math.sin(t * pulseSpeed) * 1.5;
      // Animate visor color shift
      const hue = (t * 0.1) % 1;
      if (state === "thinking") {
        mat.emissive.setHSL(0.7 + Math.sin(t * 2) * 0.1, 1, 0.5);
      }
    }

    if (chestCoreRef.current) {
      const mat = chestCoreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 3 + Math.sin(t * 2) * 2;
    }

    if (leftArmRef.current && rightArmRef.current) {
      if (state === "speaking") {
        leftArmRef.current.rotation.z = -0.3 + Math.sin(t * 3) * 0.2;
        rightArmRef.current.rotation.z = 0.3 - Math.sin(t * 3 + 1) * 0.2;
      } else if (state === "alert") {
        rightArmRef.current.rotation.z = 0.3 - Math.sin(t * 5) * 0.35;
        rightArmRef.current.rotation.x = -0.5;
      } else if (state === "success") {
        rightArmRef.current.rotation.z = -0.8 + Math.sin(t * 2) * 0.1;
        rightArmRef.current.rotation.x = -0.3;
      } else {
        leftArmRef.current.rotation.z = -0.2 + Math.sin(t * 0.8) * 0.06;
        rightArmRef.current.rotation.z = 0.2 - Math.sin(t * 0.8 + 0.5) * 0.06;
        rightArmRef.current.rotation.x = 0;
      }
    }

    if (antennaRef.current) {
      const mat = antennaRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 3 + Math.sin(t * 5) * 2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Torso - colored panels */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.55, 0.6, 0.35]} />
        <meshStandardMaterial color={bodyPrimary} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Torso side armor panels - CYAN */}
      <mesh position={[-0.26, -0.15, 0]}>
        <boxGeometry args={[0.05, 0.5, 0.3]} />
        <meshStandardMaterial color={armorCyan} emissive={c1} emissiveIntensity={0.8} metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[0.26, -0.15, 0]}>
        <boxGeometry args={[0.05, 0.5, 0.3]} />
        <meshStandardMaterial color={armorCyan} emissive={c1} emissiveIntensity={0.8} metalness={0.8} roughness={0.15} />
      </mesh>

      {/* Torso front glow strips - multi-color */}
      <mesh position={[0, -0.05, 0.176]}>
        <boxGeometry args={[0.48, 0.04, 0.01]} />
        <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, -0.15, 0.176]}>
        <boxGeometry args={[0.42, 0.03, 0.01]} />
        <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0, -0.25, 0.176]}>
        <boxGeometry args={[0.35, 0.03, 0.01]} />
        <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={2} />
      </mesh>

      {/* Core chest light - bright pulsing */}
      <mesh ref={chestCoreRef} position={[0, -0.05, 0.178]}>
        <circleGeometry args={[0.07, 16]} />
        <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={4} transparent opacity={0.95} />
      </mesh>
      {/* Outer ring */}
      <mesh position={[0, -0.05, 0.177]}>
        <ringGeometry args={[0.08, 0.1, 16]} />
        <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>

      {/* Head - colorful */}
      <mesh ref={headRef} position={[0, 0.32, 0]}>
        <boxGeometry args={[0.42, 0.35, 0.32]} />
        <meshStandardMaterial color={bodySecondary} metalness={0.8} roughness={0.2} />

        {/* Head top accent panel - PURPLE */}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.38, 0.04, 0.28]} />
          <meshStandardMaterial color={armorPurple} emissive={c2} emissiveIntensity={1.2} metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Visor / Eye - gradient glow */}
        <mesh ref={visorRef} position={[0, 0.02, 0.165]}>
          <boxGeometry args={[0.34, 0.13, 0.02]} />
          <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={3} transparent opacity={0.92} />
        </mesh>

        {/* Visor frame glow */}
        <mesh position={[0, 0.02, 0.166]}>
          <boxGeometry args={[0.36, 0.15, 0.005]} />
          <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1.5} transparent opacity={0.4} />
        </mesh>

        {/* Eye dots - bright white */}
        <mesh position={[-0.08, 0.02, 0.177]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial emissive={new THREE.Color("#ffffff")} emissiveIntensity={5} />
        </mesh>
        <mesh position={[0.08, 0.02, 0.177]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial emissive={new THREE.Color("#ffffff")} emissiveIntensity={5} />
        </mesh>

        {/* Cheek lights */}
        <mesh position={[-0.18, -0.02, 0.14]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.18, -0.02, 0.14]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={2} />
        </mesh>

        {/* Antenna */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.14, 8]} />
          <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh ref={antennaRef} position={[0, 0.31, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={4} />
        </mesh>
        {/* Second antenna for style */}
        <mesh position={[-0.12, 0.19, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 6]} />
          <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={1.5} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[-0.12, 0.24, 0]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={3} />
        </mesh>
      </mesh>

      {/* Shoulder pads - colorful */}
      <mesh position={[-0.32, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.2]} />
        <meshStandardMaterial color={armorPurple} emissive={c2} emissiveIntensity={0.6} metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0.32, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.2]} />
        <meshStandardMaterial color={armorCyan} emissive={c1} emissiveIntensity={0.6} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.35, -0.05, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1} metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.2, 8]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Forearm glow strip */}
        <mesh position={[0, -0.15, 0.04]}>
          <boxGeometry args={[0.01, 0.16, 0.01]} />
          <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={2} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.18, 8]} />
          <meshStandardMaterial color={armorCyan} emissive={c1} emissiveIntensity={0.3} metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color={c3} emissive={c3} emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.35, -0.05, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1} metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.2, 8]} />
          <meshStandardMaterial color={bodyPrimary} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0.04]}>
          <boxGeometry args={[0.01, 0.16, 0.01]} />
          <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={2} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.18, 8]} />
          <meshStandardMaterial color={armorPurple} emissive={c2} emissiveIntensity={0.3} metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Legs - colorful */}
      <mesh position={[-0.13, -0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.25, 8]} />
        <meshStandardMaterial color={bodyPrimary} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Leg glow strip */}
      <mesh position={[-0.13, -0.55, 0.045]}>
        <boxGeometry args={[0.01, 0.2, 0.01]} />
        <meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-0.13, -0.7, 0.02]}>
        <boxGeometry args={[0.09, 0.05, 0.13]} />
        <meshStandardMaterial color={armorCyan} emissive={c1} emissiveIntensity={0.5} metalness={0.9} roughness={0.15} />
      </mesh>

      <mesh position={[0.13, -0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.25, 8]} />
        <meshStandardMaterial color={bodyPrimary} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.13, -0.55, 0.045]}>
        <boxGeometry args={[0.01, 0.2, 0.01]} />
        <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.13, -0.7, 0.02]}>
        <boxGeometry args={[0.09, 0.05, 0.13]} />
        <meshStandardMaterial color={armorPurple} emissive={c2} emissiveIntensity={0.5} metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}

// Colorful particle ring
function ParticleRing({ state }: { state: RobotState }) {
  const ringRef = useRef<THREE.Points>(null!);

  const particles = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.75 + Math.random() * 0.15;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    return positions;
  }, []);

  useFrame((s) => {
    if (ringRef.current) {
      const speed = state === "thinking" ? 2 : state === "alert" ? 3 : 0.5;
      ringRef.current.rotation.y += 0.008 * speed;
    }
  });

  const visible = state === "thinking" || state === "alert" || state === "listening" || state === "speaking";
  if (!visible) return null;

  return (
    <points ref={ringRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={50}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={stateColors[state].primary}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

export const RobotScene = ({ state, signalDirection }: RobotProps) => {
  const pal = signalDirection === "BUY" ? stateColors.success :
              signalDirection === "SELL" ? stateColors.warning :
              stateColors[state];

  return (
    <Canvas
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      {/* Bright lighting to make colors pop */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-2, 1, -1]} intensity={0.6} color="#8888ff" />
      <pointLight position={[0, 0, 2.5]} intensity={1} color={pal.primary} />
      <pointLight position={[1, -1, 1]} intensity={0.4} color={pal.secondary} />
      <pointLight position={[-1, 1, 1]} intensity={0.3} color={pal.accent} />
      
      <Float speed={1.5} rotationIntensity={0.12} floatIntensity={0.35}>
        <RobotBody state={state} signalDirection={signalDirection} />
        <ParticleRing state={state} />
      </Float>
    </Canvas>
  );
};
