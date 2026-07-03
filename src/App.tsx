import { motion } from 'framer-motion'
import {
  Compass,
  Crosshair,
  Globe2,
  LocateFixed,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { StarfieldExperience } from './components/StarfieldExperience'
import { computeHorizonStars, formatUtc } from './lib/astro'
import {
  loadD3CelestialCatalog,
  type CelestialCatalog,
} from './lib/celestialCatalog'
import type { ExperienceStage, LocationTarget } from './types'

const DEFAULT_LOCATION: LocationTarget = {
  name: 'Mauna Kea',
  lat: 19.8206,
  lon: -155.4681,
  note: 'High-altitude Pacific observatory',
}

const LOCATIONS: readonly LocationTarget[] = [
  DEFAULT_LOCATION,
  {
    name: 'Atacama',
    lat: -24.627,
    lon: -70.404,
    note: 'Southern desert sky window',
  },
  {
    name: 'Shanghai',
    lat: 31.2304,
    lon: 121.4737,
    note: 'Urban East Asia reference',
  },
  {
    name: 'Reykjavik',
    lat: 64.1466,
    lon: -21.9426,
    note: 'High northern latitude',
  },
]

const STAGE_COPY: Record<ExperienceStage, string> = {
  EARTH: 'Earth orbit',
  SKY: 'Local sky',
}

function App() {
  const [stage, setStage] = useState<ExperienceStage>('EARTH')
  const [target, setTarget] = useState<LocationTarget>(DEFAULT_LOCATION)
  const [form, setForm] = useState({
    lat: DEFAULT_LOCATION.lat.toString(),
    lon: DEFAULT_LOCATION.lon.toString(),
  })
  const [skySignal, setSkySignal] = useState(0)
  const [utcDate, setUtcDate] = useState(() => new Date())
  const [catalog, setCatalog] = useState<CelestialCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setUtcDate(new Date()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true

    loadD3CelestialCatalog()
      .then((nextCatalog) => {
        if (active) {
          setCatalog(nextCatalog)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(
            error instanceof Error ? error.message : 'Failed to load catalog',
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  const skyDate = useMemo(() => floorUtcToMinute(utcDate), [utcDate])

  const visibleStars = useMemo(
    () =>
      catalog
        ? computeHorizonStars(target, skyDate, catalog.stars)
            .filter((star) => star.visible)
            .slice(0, 5)
        : [],
    [catalog, skyDate, target],
  )

  const selectLocation = (location: LocationTarget) => {
    setTarget(location)
    setForm({
      lat: location.lat.toString(),
      lon: location.lon.toString(),
    })
  }

  const applyManualLocation = (): LocationTarget => {
    const lat = clampNumber(Number.parseFloat(form.lat), -90, 90)
    const lon = normalizeLongitude(Number.parseFloat(form.lon))
    const nextTarget: LocationTarget = {
      name: 'Manual coordinates',
      lat,
      lon,
      note: 'Entered from the coordinate panel',
    }

    setTarget(nextTarget)
    setForm({
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
    })

    return nextTarget
  }

  const showSky = () => {
    if (stage !== 'EARTH') {
      return
    }

    const nextTarget = applyManualLocation()
    setTarget(nextTarget)
    setSkySignal((value) => value + 1)
  }

  const resetToEarth = () => {
    setStage('EARTH')
  }

  const handleTargetChange = (nextTarget: LocationTarget) => {
    setTarget(nextTarget)
    setForm({
      lat: nextTarget.lat.toFixed(4),
      lon: nextTarget.lon.toFixed(4),
    })
  }

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-[#02050c] text-slate-100">
      <StarfieldExperience
        catalog={catalog}
        onStageChange={setStage}
        onTargetChange={handleTargetChange}
        skySignal={skySignal}
        stage={stage}
        target={target}
        utcDate={skyDate}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(42,170,255,0.14),transparent_36%),linear-gradient(180deg,rgba(2,5,12,0)_60%,rgba(2,5,12,0.84)_100%)]" />
      <section className="pointer-events-none absolute inset-0 grid grid-cols-1 content-between gap-4 p-4 sm:p-5 lg:grid-cols-[360px_1fr_320px]">
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className="pointer-events-auto max-w-full self-start rounded-lg border border-white/12 bg-[#07111f]/72 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl"
          initial={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
                <Globe2 className="size-4" />
                R3F starfield
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white">
                Earth to local sky
              </h1>
            </div>
            <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs font-medium text-cyan-100">
              {STAGE_COPY[stage]}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {LOCATIONS.map((location) => (
              <button
                className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm text-slate-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={stage !== 'EARTH'}
                key={location.name}
                onClick={() => selectLocation(location)}
                type="button"
              >
                <span className="block font-medium">{location.name}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {location.note}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium uppercase text-slate-400">
              Latitude
              <input
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                disabled={stage !== 'EARTH'}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((value) => ({ ...value, lat: event.target.value }))
                }
                value={form.lat}
              />
            </label>
            <label className="text-xs font-medium uppercase text-slate-400">
              Longitude
              <input
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                disabled={stage !== 'EARTH'}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((value) => ({ ...value, lon: event.target.value }))
                }
                value={form.lon}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-900"
              disabled={stage !== 'EARTH'}
              onClick={showSky}
              type="button"
            >
              <LocateFixed className="size-4" />
              Show sky
            </button>
            <button
              aria-label="Reset to Earth"
              className="inline-flex size-11 items-center justify-center rounded-md border border-white/12 bg-white/[0.06] text-slate-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
              onClick={resetToEarth}
              type="button"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </motion.aside>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto mx-auto hidden w-full max-w-xl self-start rounded-lg border border-white/10 bg-[#07111f]/54 px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl md:block"
          initial={{ opacity: 0, y: -14 }}
          transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
        >
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric
              icon={<Crosshair className="size-4" />}
              label="Target"
              value={target.name}
            />
            <Metric
              icon={<Compass className="size-4" />}
              label="Coordinates"
              value={`${target.lat.toFixed(2)}, ${target.lon.toFixed(2)}`}
            />
            <Metric
              icon={<Sparkles className="size-4" />}
              label="UTC"
              value={formatUtc(utcDate).slice(11, 19)}
            />
          </div>
        </motion.div>

        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className="pointer-events-auto self-end rounded-lg border border-white/12 bg-[#07111f]/72 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:self-start"
          initial={{ opacity: 0, x: 16 }}
          transition={{ delay: 0.16, duration: 0.45, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase text-slate-400">
                Computed sky
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-normal text-white">
                Visible bright stars
              </h2>
            </div>
            <Sparkles className="size-5 text-cyan-200" />
          </div>
          <div className="mt-4 space-y-2">
            {catalogError ? (
              <div className="rounded-md border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm text-red-100">
                {catalogError}
              </div>
            ) : null}
            {!catalog && !catalogError ? (
              <div className="rounded-md border border-white/8 bg-white/[0.045] px-3 py-2 text-sm text-slate-300">
                Loading d3-celestial catalog
              </div>
            ) : null}
            {visibleStars.map((star) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-white/8 bg-white/[0.045] px-3 py-2"
                key={star.id}
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {star.displayName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {star.constellation}
                  </div>
                </div>
                <div className="text-right text-xs text-cyan-100">
                  <div>{star.altitude.toFixed(1)} deg alt</div>
                  <div className="text-slate-400">
                    {star.azimuth.toFixed(0)} deg az
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.aside>
      </section>
    </main>
  )
}

type MetricProps = {
  icon: ReactNode
  label: string
  value: string
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="min-w-0 rounded-md border border-white/8 bg-white/[0.045] px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-white">{value}</div>
    </div>
  )
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return 0
  }

  return Math.min(Math.max(value, min), max)
}

function normalizeLongitude(value: number): number {
  if (Number.isNaN(value)) {
    return 0
  }

  const normalized = ((((value + 180) % 360) + 360) % 360) - 180

  return normalized === -180 ? 180 : normalized
}

function floorUtcToMinute(date: Date): Date {
  const nextDate = new Date(date)
  nextDate.setUTCSeconds(0, 0)

  return nextDate
}

export default App
