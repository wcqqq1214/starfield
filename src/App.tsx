import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Globe2,
  LocateFixed,
  RotateCcw,
  Search,
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
  name: 'Shanghai',
  lat: 31.2304,
  lon: 121.4737,
  note: 'China',
}

const CITY_LOCATIONS: readonly LocationTarget[] = [
  DEFAULT_LOCATION,
  {
    name: 'Beijing',
    lat: 39.9042,
    lon: 116.4074,
    note: 'China',
  },
  {
    name: 'Tokyo',
    lat: 35.6762,
    lon: 139.6503,
    note: 'Japan',
  },
  {
    name: 'Seoul',
    lat: 37.5665,
    lon: 126.978,
    note: 'South Korea',
  },
  {
    name: 'Singapore',
    lat: 1.3521,
    lon: 103.8198,
    note: 'Singapore',
  },
  {
    name: 'Bangkok',
    lat: 13.7563,
    lon: 100.5018,
    note: 'Thailand',
  },
  {
    name: 'Jakarta',
    lat: -6.2088,
    lon: 106.8456,
    note: 'Indonesia',
  },
  {
    name: 'Mumbai',
    lat: 19.076,
    lon: 72.8777,
    note: 'India',
  },
  {
    name: 'Dubai',
    lat: 25.2048,
    lon: 55.2708,
    note: 'United Arab Emirates',
  },
  {
    name: 'Istanbul',
    lat: 41.0082,
    lon: 28.9784,
    note: 'Turkey',
  },
  {
    name: 'London',
    lat: 51.5072,
    lon: -0.1276,
    note: 'United Kingdom',
  },
  {
    name: 'Paris',
    lat: 48.8566,
    lon: 2.3522,
    note: 'France',
  },
  {
    name: 'Berlin',
    lat: 52.52,
    lon: 13.405,
    note: 'Germany',
  },
  {
    name: 'Moscow',
    lat: 55.7558,
    lon: 37.6173,
    note: 'Russia',
  },
  {
    name: 'New York',
    lat: 40.7128,
    lon: -74.006,
    note: 'United States',
  },
  {
    name: 'Los Angeles',
    lat: 34.0522,
    lon: -118.2437,
    note: 'United States',
  },
  {
    name: 'Chicago',
    lat: 41.8781,
    lon: -87.6298,
    note: 'United States',
  },
  {
    name: 'Toronto',
    lat: 43.6532,
    lon: -79.3832,
    note: 'Canada',
  },
  {
    name: 'Mexico City',
    lat: 19.4326,
    lon: -99.1332,
    note: 'Mexico',
  },
  {
    name: 'Sao Paulo',
    lat: -23.5558,
    lon: -46.6396,
    note: 'Brazil',
  },
  {
    name: 'Buenos Aires',
    lat: -34.6037,
    lon: -58.3816,
    note: 'Argentina',
  },
  {
    name: 'Cairo',
    lat: 30.0444,
    lon: 31.2357,
    note: 'Egypt',
  },
  {
    name: 'Cape Town',
    lat: -33.9249,
    lon: 18.4241,
    note: 'South Africa',
  },
  {
    name: 'Sydney',
    lat: -33.8688,
    lon: 151.2093,
    note: 'Australia',
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
  const [citySearch, setCitySearch] = useState('')
  const [citySearchOpen, setCitySearchOpen] = useState(false)
  const [computedOpen, setComputedOpen] = useState(false)
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

  const skyMinute = Math.floor(utcDate.getTime() / 60_000)
  const skyDate = useMemo(() => new Date(skyMinute * 60_000), [skyMinute])

  const visibleStars = useMemo(
    () =>
      catalog
        ? computeHorizonStars(target, skyDate, catalog.stars)
            .filter((star) => star.visible)
            .slice(0, 5)
        : [],
    [catalog, skyDate, target],
  )

  const citySuggestions = useMemo(() => {
    const query = citySearch.trim().toLowerCase()

    if (!query) {
      return []
    }

    return CITY_LOCATIONS.filter((location) =>
      `${location.name} ${location.note}`.toLowerCase().includes(query),
    ).slice(0, 5)
  }, [citySearch])

  const selectLocation = (location: LocationTarget) => {
    setTarget(location)
    setForm({
      lat: location.lat.toFixed(4),
      lon: location.lon.toFixed(4),
    })
    setCitySearch(location.name)
    setCitySearchOpen(false)
  }

  const resolveFormTarget = (): LocationTarget => {
    const lat = clampNumber(Number.parseFloat(form.lat), -90, 90)
    const lon = normalizeLongitude(Number.parseFloat(form.lon))
    const keepsSelectedLocation =
      Math.abs(lat - target.lat) < 0.0001 && Math.abs(lon - target.lon) < 0.0001
    const nextTarget: LocationTarget = keepsSelectedLocation
      ? { ...target, lat, lon }
      : {
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

    resolveFormTarget()
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
    setCitySearch(
      CITY_LOCATIONS.some((location) => location.name === nextTarget.name)
        ? nextTarget.name
        : '',
    )
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

          <div className="relative mt-5">
            <label className="text-xs font-medium uppercase text-slate-400">
              City
              <div className="mt-1 flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 transition focus-within:border-cyan-300/60">
                <Search className="size-4 shrink-0 text-slate-500" />
                <input
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  disabled={stage !== 'EARTH'}
                  onBlur={() => setCitySearchOpen(false)}
                  onChange={(event) => {
                    setCitySearch(event.target.value)
                    setCitySearchOpen(true)
                  }}
                  onFocus={() => setCitySearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && citySuggestions[0]) {
                      event.preventDefault()
                      selectLocation(citySuggestions[0])
                    }
                  }}
                  placeholder="Search city"
                  value={citySearch}
                />
              </div>
            </label>

            {citySearchOpen && citySuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-white/12 bg-[#07111f]/96 shadow-2xl shadow-black/35 backdrop-blur-xl">
                {citySuggestions.map((location) => (
                  <button
                    className="flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-sm text-slate-100 transition hover:bg-cyan-300/10"
                    key={location.name}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectLocation(location)
                    }}
                    type="button"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {location.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {location.note}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
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
          className="pointer-events-auto mx-auto hidden w-full max-w-md self-start rounded-lg border border-white/10 bg-[#07111f]/54 px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl md:block"
          initial={{ opacity: 0, y: -14 }}
          transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
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
          <button
            aria-expanded={computedOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setComputedOpen((value) => !value)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase text-slate-400">
                Computed sky
              </span>
              <span className="mt-1 block truncate text-lg font-semibold tracking-normal text-white">
                {computedOpen ? 'Visible bright stars' : `${visibleStars.length} bright stars`}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-cyan-200">
              <Sparkles className="size-5" />
              {computedOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          </button>

          {computedOpen ? (
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
          ) : null}
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

export default App
