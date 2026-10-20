import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideProps,
} from 'lucide-react'
import type { Condition } from '@/engine/types'

const COLORS: Record<Condition, string> = {
  clear: 'var(--sun)',
  partly: 'var(--sun)',
  cloudy: 'var(--wind)',
  fog: 'var(--wind)',
  drizzle: 'var(--rain)',
  rain: 'var(--rain)',
  snow: 'var(--snow)',
  thunder: 'var(--rain)',
}

export function WeatherIcon({ condition, night, ...props }: { condition: Condition; night?: boolean } & LucideProps) {
  const color = night && (condition === 'clear' || condition === 'partly') ? 'var(--wind)' : COLORS[condition]
  const common = { color, strokeWidth: 1.75, 'aria-hidden': true, ...props }
  switch (condition) {
    case 'clear':
      return night ? <Moon {...common} /> : <Sun {...common} />
    case 'partly':
      return night ? <CloudMoon {...common} /> : <CloudSun {...common} />
    case 'cloudy':
      return <Cloud {...common} />
    case 'fog':
      return <CloudFog {...common} />
    case 'drizzle':
      return <CloudDrizzle {...common} />
    case 'rain':
      return <CloudRain {...common} />
    case 'snow':
      return <CloudSnow {...common} />
    case 'thunder':
      return <CloudLightning {...common} />
  }
}
