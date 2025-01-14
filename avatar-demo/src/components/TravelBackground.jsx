import React from "react";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";

const TravelBackground = () => {
  const texture = useLoader(
    TextureLoader,
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"
  );

  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
};

export default TravelBackground;
