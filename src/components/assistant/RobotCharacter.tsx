// DASOMTMFX - 3D AI Robot Character (Procedural Three.js)
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

export type RobotState = "idle" | "listening" | "thinking" | "speaking" | "alert" | "success" | "warning";

interface RobotProps {
  state: RobotState;
  signalDirection?: "BUY" | "SELL" | null;
}

const stateColors: Record<RobotState, string> = {
  idle: "#22c55e",
  listening: "#3b82f6",
  thinking: "#a855f7",
  speaking: "#06b6d4",
  alert: "#f59e0b",
  success: "#22c55e",
  warning: "#ef4444",
};

function RobotBody({ state, signalDirection }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Mesh>(null!);
  const visorRef = useRef<THREE.Mesh>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const rightArmRef = useRef<THREE.Group>(null!);
  const antennaRef = useRef<THREE.Mesh>(null!);

  const glowColor = useMemo(() => {
    if (signalDirection === "BUY") return "#22c55e";
    if (signalDirection === "SELL") return "#ef4444";
    return stateColors[state];
  }, [state, signalDirection]);

  const emissiveColor = useMemo(() => new THREE.Color(glowColor), [glowColor]);
  const bodyColor = useMemo(() => new THREE.Color("#2a2d35"), []);
  const metalColor = useMemo(() => new THREE.Color("#4a4d55"), []);

  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime;

    // Idle breathing
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.03;
    }

    // Head subtle rotation
    if (headRef.current) {
      const headSpeed = state === "listening" ? 2.5 : state === "thinking" ? 3 : 0.8;
      headRef.current.rotation.y = Math.sin(t * headSpeed) * (state === "thinking" ? 0.15 : 0.08);
      headRef.current.rotation.x = Math.sin(t * 0.5) * 0.03;
    }

    // Visor pulse
    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      const pulseSpeed = state === "alert" ? 4 : state === "thinking" ? 3 : 1.5;
      const intensity = state === "alert" ? 3 + Math.sin(t * pulseSpeed) * 2 : 1.5 + Math.sin(t * pulseSpeed) * 0.8;
      mat.emissiveIntensity = intensity;
    }

    // Arm animations
    if (leftArmRef.current && rightArmRef.current) {
      if (state === "speaking") {
        leftArmRef.current.rotation.z = -0.3 + Math.sin(t * 3) * 0.15;
        rightArmRef.current.rotation.z = 0.3 - Math.sin(t * 3 + 1) * 0.15;
      } else if (state === "alert") {
        rightArmRef.current.rotation.z = 0.3 - Math.sin(t * 5) * 0.3;
        rightArmRef.current.rotation.x = -0.5;
      } else if (state === "success") {
        rightArmRef.current.rotation.z = -0.8 + Math.sin(t * 2) * 0.1;
        rightArmRef.current.rotation.x = -0.3;
      } else {
        leftArmRef.current.rotation.z = -0.2 + Math.sin(t * 0.8) * 0.05;
        rightArmRef.current.rotation.z = 0.2 - Math.sin(t * 0.8 + 0.5) * 0.05;
        rightArmRef.current.rotation.x = 0;
      }
    }

    // Antenna glow
    if (antennaRef.current) {
      const mat = antennaRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(t * 4) * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.55, 0.6, 0.35]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Torso accent lines */}
      <mesh position={[0, -0.15, 0.176]}>
        <boxGeometry args={[0.48, 0.04, 0.01]} />
        <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, -0.28, 0.176]}>
        <boxGeometry args={[0.35, 0.03, 0.01]} />
        <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={1.5} />
      </mesh>

      {/* Core chest light */}
      <mesh position={[0, -0.05, 0.176]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={3} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 0.32, 0]}>
        <boxGeometry args={[0.42, 0.35, 0.32]} />
        <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.25} />

        {/* Visor / Eye */}
        <mesh ref={visorRef} position={[0, 0.02, 0.165]}>
          <boxGeometry args={[0.32, 0.12, 0.02]} />
          <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={2} transparent opacity={0.9} />
        </mesh>

        {/* Eye dots */}
        <mesh position={[-0.08, 0.02, 0.175]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial emissive={new THREE.Color("#ffffff")} emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.08, 0.02, 0.175]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial emissive={new THREE.Color("#ffffff")} emissiveIntensity={3} />
        </mesh>

        {/* Antenna */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh ref={antennaRef} position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={2.5} />
        </mesh>
      </mesh>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.35, -0.05, 0]}>
        {/* Shoulder */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.2, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.18, 8]} />
          <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Hand glow */}
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.35, -0.05, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.035, 0.2, 8]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.18, 8]} />
          <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={emissiveColor} emissive={emissiveColor} emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Legs */}
      {/* Left */}
      <mesh position={[-0.13, -0.58, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.3, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-0.13, -0.75, 0.02]}>
        <boxGeometry args={[0.08, 0.04, 0.12]} />
        <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Right */}
      <mesh position={[0.13, -0.58, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.3, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.13, -0.75, 0.02]}>
        <boxGeometry args={[0.08, 0.04, 0.12]} />
        <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Floating particle ring
function ParticleRing({ state }: { state: RobotState }) {
  const ringRef = useRef<THREE.Points>(null!);

  const particles = useMemo(() => {
    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.1;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    return positions;
  }, []);

  useFrame((s) => {
    if (ringRef.current) {
      const speed = state === "thinking" ? 1.5 : 0.3;
      ringRef.current.rotation.y += 0.005 * speed;
    }
  });

  const visible = state === "thinking" || state === "alert" || state === "listening";

  if (!visible) return null;

  return (
    <points ref={ringRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={40}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={stateColors[state]}
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

export const RobotScene = ({ state, signalDirection }: RobotProps) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.2], fov: 45 }}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} />
      <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#4488ff" />
      <pointLight position={[0, 0, 2]} intensity={0.5} color={stateColors[state]} />
      
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <RobotBody state={state} signalDirection={signalDirection} />
        <ParticleRing state={state} />
      </Float>
    </Canvas>
  );
};
