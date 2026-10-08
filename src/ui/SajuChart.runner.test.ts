// The existing Vite configuration discovers only *.test.ts.
// Keep this entry point inside the authorized UI scope so npm test also runs the TSX suite.
import './SajuChart.test'
