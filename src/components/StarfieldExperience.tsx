import {
  OrbitControls,
  useTexture,
} from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Camera,
} from 'three'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  computeHorizonStars,
  type HorizonStar,
} from '../lib/astro'
import type { CelestialCatalog } from '../lib/celestialCatalog'
import {
  EARTH_RADIUS,
  latLonToVector3,
  vector3ToLatLon,
} from '../lib/geo'
import type { ActiveLocation, ExperienceStage, LocationTarget } from '../types'

type StarfieldExperienceProps = {
  catalog: CelestialCatalog | null
  stage: ExperienceStage
  target: LocationTarget
  skySignal: number
  utcDate: Date
  onStageChange: (stage: ExperienceStage) => void
  onTargetChange: (target: LocationTarget) => void
}

const CAMERA_HOME = new Vector3(0, 1.55, 5.15)
const SKY_CHART_RADIUS = 2.35
const SKY_CHART_CAMERA = new Vector3(0, 0, 6.4)

export function StarfieldExperience({
  catalog,
  stage,
  target,
  skySignal,
  utcDate,
  onStageChange,
  onTargetChange,
}: StarfieldExperienceProps) {
  return (
    <Canvas
      camera={{ position: CAMERA_HOME.toArray(), fov: 48, near: 0.01, far: 80 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#02050c']} />
      <fog attach="fog" args={['#02050c', 11, 38]} />
      <ambientLight intensity={0.58} />
      <directionalLight color="#f7fbff" intensity={3.4} position={[4, 2, 4]} />
      <directionalLight color="#5fb0ff" intensity={1.2} position={[-3, 1, -4]} />
      <SceneContent
        catalog={catalog}
        onStageChange={onStageChange}
        onTargetChange={onTargetChange}
        skySignal={skySignal}
        stage={stage}
        target={target}
        utcDate={utcDate}
      />
    </Canvas>
  )
}

type SceneContentProps = StarfieldExperienceProps

function SceneContent({
  catalog,
  stage,
  target,
  skySignal,
  utcDate,
  onStageChange,
  onTargetChange,
}: SceneContentProps) {
  const { camera, gl } = useThree()
  const earthGroupRef = useRef<Group | null>(null)
  const lastSkySignalRef = useRef(0)
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(
    null,
  )

  const showLocalSky = useCallback(
    (nextTarget: LocationTarget, rotationY: number) => {
      if (stage !== 'EARTH') {
        return
      }

      const active: ActiveLocation = { ...nextTarget, rotationY }

      setActiveLocation(active)
      onTargetChange(nextTarget)
      applyPlanisphereCamera(camera)
      onStageChange('SKY')
    },
    [camera, onStageChange, onTargetChange, stage],
  )

  const handleGlobePick = useCallback(
    (pickedTarget: LocationTarget) => {
      const rotationY = earthGroupRef.current?.rotation.y ?? 0
      showLocalSky(pickedTarget, rotationY)
    },
    [showLocalSky],
  )

  useEffect(() => {
    if (skySignal === lastSkySignalRef.current) {
      return
    }

    lastSkySignalRef.current = skySignal

    if (skySignal > 0) {
      showLocalSky(target, earthGroupRef.current?.rotation.y ?? 0)
    }
  }, [showLocalSky, skySignal, target])

  useEffect(() => {
    if (stage !== 'EARTH') {
      return
    }

    setActiveLocation(null)
    camera.position.copy(CAMERA_HOME)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
  }, [camera, stage])

  useEffect(() => {
    gl.domElement.style.cursor = 'default'
  }, [gl])

  return (
    <>
      {stage === 'EARTH' ? <StaticStarShell stage={stage} /> : null}
      <Earth
        activeLocation={activeLocation}
        groupRef={earthGroupRef}
        onPick={handleGlobePick}
        stage={stage}
      />
      {activeLocation && stage === 'SKY' && catalog ? (
        <LocalSky
          activeLocation={activeLocation}
          catalog={catalog}
          utcDate={utcDate}
        />
      ) : null}
      <OrbitControls
        autoRotate={stage === 'EARTH'}
        autoRotateSpeed={0.28}
        enableDamping
        enablePan={false}
        enableZoom={stage === 'EARTH'}
        enabled={stage === 'EARTH'}
        maxDistance={7}
        minDistance={2.7}
      />
    </>
  )
}

type EarthProps = {
  activeLocation: ActiveLocation | null
  groupRef: RefObject<Group | null>
  onPick: (target: LocationTarget) => void
  stage: ExperienceStage
}

function Earth({ activeLocation, groupRef, onPick, stage }: EarthProps) {
  const earthTexture = useTexture('/vendor/nasa/flat_earth03.jpg')
  const markerPosition = useMemo(() => {
    if (!activeLocation) {
      return null
    }

    return latLonToVector3(activeLocation.lat, activeLocation.lon, 1.035)
  }, [activeLocation])

  useFrame((_, delta) => {
    if (stage === 'EARTH' && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  useEffect(() => {
    earthTexture.colorSpace = SRGBColorSpace
    earthTexture.anisotropy = 8
    earthTexture.needsUpdate = true
  }, [earthTexture])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()

    if (!groupRef.current || stage !== 'EARTH') {
      return
    }

    const localPoint = event.point.clone()
    groupRef.current.worldToLocal(localPoint)
    const { lat, lon } = vector3ToLatLon(localPoint)

    onPick({
      name: 'Globe selection',
      lat,
      lon,
      note: 'Picked directly on the rotating Earth',
    })
  }

  return (
    <group ref={groupRef} visible={stage !== 'SKY'}>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          color="#f6fbff"
          emissive="#051422"
          emissiveIntensity={0.18}
          map={earthTexture}
          metalness={0.02}
          roughness={0.82}
        />
      </mesh>
      <mesh scale={1.065}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#62c8ff"
          opacity={0.14}
          side={BackSide}
          transparent
        />
      </mesh>
      <mesh scale={1.135}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#5aa7ff"
          opacity={0.045}
          side={BackSide}
          transparent
        />
      </mesh>
      {markerPosition ? (
        <group position={markerPosition}>
          <mesh>
            <sphereGeometry args={[0.025, 24, 24]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#ffffff"
              toneMapped={false}
            />
          </mesh>
          <mesh scale={1.9}>
            <sphereGeometry args={[0.025, 24, 24]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color="#78d9ff"
              opacity={0.35}
              transparent
            />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

type StaticStarShellProps = {
  stage: ExperienceStage
}

function StaticStarShell({ stage }: StaticStarShellProps) {
  const positions = useMemo(() => {
    const random = mulberry32(42)
    const data = new Float32Array(1800 * 3)

    for (let i = 0; i < 1800; i += 1) {
      const radius = 28 + random() * 18
      const theta = random() * Math.PI * 2
      const z = random() * 2 - 1
      const radial = Math.sqrt(1 - z * z)

      data[i * 3] = radius * radial * Math.cos(theta)
      data[i * 3 + 1] = radius * z
      data[i * 3 + 2] = radius * radial * Math.sin(theta)
    }

    return data
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#d7e6ff"
        depthWrite={false}
        opacity={stage === 'SKY' ? 0.28 : 0.52}
        size={stage === 'SKY' ? 0.026 : 0.018}
        sizeAttenuation
        transparent
      />
    </points>
  )
}

type LocalSkyProps = {
  activeLocation: ActiveLocation
  catalog: CelestialCatalog
  utcDate: Date
}

function LocalSky({ activeLocation, catalog, utcDate }: LocalSkyProps) {
  const stars = useMemo(
    () =>
      computeHorizonStars(activeLocation, utcDate, catalog.stars).filter(
        (star) => star.visible,
      ),
    [activeLocation, catalog.stars, utcDate],
  )

  return (
    <group>
      <PlanisphereStarField stars={stars} />
    </group>
  )
}

type PlanisphereStarFieldProps = {
  stars: HorizonStar[]
}

function PlanisphereStarField({ stars }: PlanisphereStarFieldProps) {
  const { positions, colors } = useMemo(() => {
    const nextPositions = new Float32Array(stars.length * 3)
    const nextColors = new Float32Array(stars.length * 3)
    const color = new Color()

    stars.forEach((star, index) => {
      const radius = ((90 - star.altitude) / 90) * SKY_CHART_RADIUS
      const azimuth = MathUtils.degToRad(star.azimuth)

      color.set(star.color).multiplyScalar(
        MathUtils.clamp(star.brightness / 2.2, 0.22, 1.35),
      )
      nextPositions[index * 3] = Math.sin(azimuth) * radius
      nextPositions[index * 3 + 1] = Math.cos(azimuth) * radius
      nextPositions[index * 3 + 2] = 0
      nextColors[index * 3] = color.r
      nextColors[index * 3 + 1] = color.g
      nextColors[index * 3 + 2] = color.b
    })

    return { positions: nextPositions, colors: nextColors }
  }, [stars])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        opacity={0.95}
        size={2.15}
        sizeAttenuation={false}
        transparent
        vertexColors
      />
    </points>
  )
}

function applyPlanisphereCamera(camera: Camera) {
  camera.position.copy(SKY_CHART_CAMERA)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
