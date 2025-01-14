import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import TravelBackground from "./TravelBackground";

const playAnimation = (action, options = {}) => {
  const { loop = true, clamp = false, duration = 0.5, timeScale = 1 } = options;

  if (action) {
    action.reset().fadeIn(duration).play();

    action.setEffectiveTimeScale(timeScale);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    action.clampWhenFinished = clamp;
  }
};

function HumanAvatar({ speaking, emotion }) {
  const group = useRef();
  // Use your Ready Player Me avatar URL
  const { scene, animations } = useGLTF(
    "https://models.readyplayer.me/677966fc131c432a8eed4bd1.glb?pose=A&textureAtlas=1024&morphTargets=ARKit,Oculus,Mouth,Eyes&useHands=true&animation=idle,talk,wave,jump,idle_sad"
  );
  const { actions } = useAnimations(animations, scene);

  // Adjust avatar scale and position on load
  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const height = size.y;
      const center = box.getCenter(new THREE.Vector3());

      // Adjust scale based on height
      const scale = 3.2 / height;
      scene.scale.setScalar(scale);

      // Center the avatar
      scene.position.x = -center.x;
      scene.position.y = -center.y * 0.9;
      scene.position.z = -center.z;
    }
  }, [scene]);

  // Debug available animations
  useEffect(() => {
    console.log("Available animations:", Object.keys(actions));
    console.log("Full animation details:", actions);
  }, [actions]);

  useEffect(() => {
    // Stop all current animations
    Object.values(actions).forEach((action) => {
      if (action?.isRunning()) action.fadeOut(0.5);
    });

    // Apply animations based on state
    if (speaking) {
      playAnimation(actions.talk, { timeScale: 1.2 });
    } else if (emotion) {
      const animationMap = {
        happy: "jump",
        sad: "idle_sad",
        greeting: "wave",
        explaining: "talk",
        thinking: "idle",
        excited: "jump",
      };

      const animationName = animationMap[emotion];
      playAnimation(actions[animationName], {
        loop: ["idle", "idle_sad"].includes(animationName),
        clamp: !["idle", "idle_sad"].includes(animationName),
        timeScale: 1.2,
      });
    } else {
      playAnimation(actions.idle, { timeScale: 0.8 });
    }

    return () => {
      Object.values(actions).forEach((action) => {
        if (action?.isRunning()) action.fadeOut(0.5);
      });
    };
  }, [speaking, emotion, actions]);

  // Add natural idle movement
  useFrame((state) => {
    if (group.current && !speaking && !emotion) {
      // Subtle breathing
      group.current.position.y =
        Math.sin(state.clock.getElapsedTime() * 0.5) * 0.01;
      // Subtle head movement
      group.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05;
    }
  });

  return (
    <group ref={group} position={[0, -0.8, 0]}>
      <primitive object={scene} />
    </group>
  );
}

const Avatar3D = ({ speaking, emotion }) => {
  return (
    <div style={{ height: "700px", width: "100%" }}>
      <Canvas
        camera={{
          position: [0, 1.4, 4.2],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        style={{
          background: "transparent",
          borderRadius: "15px",
        }}
      >
        <TravelBackground />

        <ambientLight intensity={0.7} />
        <spotLight
          position={[5, 5, 5]}
          angle={0.15}
          penumbra={1}
          intensity={1.3}
          castShadow
        />
        <pointLight position={[-5, -5, -5]} intensity={0.6} />

        <HumanAvatar speaking={speaking} emotion={emotion} />

        <ContactShadows
          opacity={0.4}
          scale={25}
          blur={2}
          far={12}
          resolution={256}
          color="#000000"
        />

        <Environment preset="city" />

        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 3}
          maxAzimuthAngle={Math.PI / 3}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  );
};

export default Avatar3D;
