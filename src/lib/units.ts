import type { Bike, Profile, Unit } from '../types'

// The unit a bike's mileage is shown in: its own override, else the account preference.
export function effectiveUnit(bike: Pick<Bike, 'unit_override'>, profile: Profile | null): Unit {
  return bike.unit_override ?? profile?.unit_preference ?? 'mi'
}
