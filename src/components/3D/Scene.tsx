import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Float } from '@react-three/drei';
import { Suspense, useState } from 'react';

function Model() {
  const [error, setError] = useState(false);
  
  // Gunakan model sederhana sebagai fallback
  const FallbackModel = () => (
    <group>
      {/* Bangunan utama */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      {/* Atap */}
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[1.5, 1, 4]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
      {/* Tiang bendera */}
      <mesh position={[1.5, 1, 1.5]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );

  try {
    const { scene } = useGLTF('/models/politeknik.glb');
    return (
      <Float
        speed={1.5}
        rotationIntensity={0.2}
        floatIntensity={0.5}
      >
        <primitive object={scene} scale={2} />
      </Float>
    );
  } catch (err) {
    console.error('Error loading model:', err);
    return <FallbackModel />;
  }
}

export default function Scene() {
  return (
    <div className="h-[500px] w-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="gray" />
          </mesh>
        }>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <Model />
          <Environment preset="city" />
          <OrbitControls enableZoom={false} />
        </Suspense>
      </Canvas>
    </div>
  );
} 