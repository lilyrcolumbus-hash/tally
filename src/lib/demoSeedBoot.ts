import { seedDemoDataIfFirstVisit } from '@/lib/demoSeed'

// Imported first in main.tsx so the sample data exists before the category store reads localStorage.
seedDemoDataIfFirstVisit()
