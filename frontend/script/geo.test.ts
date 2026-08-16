// Run with: npx tsx src/lib/geo.test.ts
// Plain assertions, no test framework needed — this is deliberately simple
// enough to read as documentation of the yaw convention, not just verify it.
import { computeCameraBearing, normalizeBearing, destinationPoint, buildFovConePolygon } from "../src/lib/geo";
import * as process from "process";

let passed = 0;
let failed = 0;

function approxEqual(a: number, b: number, tolerance = 1e-6): boolean {
  return Math.abs(a - b) < tolerance;
}

function check(name: string, actual: number, expected: number, tolerance = 1e-6) {
  if (approxEqual(actual, expected, tolerance)) {
    console.log(`  ok ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

console.log("normalizeBearing");
check("360 -> 0", normalizeBearing(360), 0);
check("-90 -> 270", normalizeBearing(-90), 270);
check("450 -> 90", normalizeBearing(450), 90);
check("0 -> 0", normalizeBearing(0), 0);

console.log("\ncomputeCameraBearing - the two worked examples from the Step 5 spec");
check("heading 90 (E) + mountYaw 0 -> camera looks East (90)", computeCameraBearing(90, 0), 90);
check("heading 90 (E) + mountYaw -90 -> camera looks North (0)", computeCameraBearing(90, -90), 0);

console.log("\ncomputeCameraBearing - cardinal headings with zero mount offset (Step 5 test #1-4)");
check("heading 0 (N) + mountYaw 0 -> North", computeCameraBearing(0, 0), 0);
check("heading 90 (E) + mountYaw 0 -> East", computeCameraBearing(90, 0), 90);
check("heading 180 (S) + mountYaw 0 -> South", computeCameraBearing(180, 0), 180);
check("heading 270 (W) + mountYaw 0 -> West", computeCameraBearing(270, 0), 270);

console.log("\ncomputeCameraBearing - yaw offset test (Step 5 test #5)");
check("heading 0 (N) + mountYaw 90 (right-mounted) -> East", computeCameraBearing(0, 90), 90);
check("heading 0 (N) + mountYaw -90 (left-mounted) -> West", computeCameraBearing(0, -90), 270);
check("heading 180 (S) + mountYaw 90 -> West", computeCameraBearing(180, 90), 270);
check("wraparound: heading 350 + mountYaw 20 -> 10", computeCameraBearing(350, 20), 10);

console.log("\ndestinationPoint - sanity checks against known geodesic behavior");
{
  const [lat, lng] = destinationPoint(37.4636, -122.4286, 0, 1000);
  check("due-north travel increases latitude", lat > 37.4636 ? 1 : 0, 1);
  check("due-north travel leaves longitude ~unchanged", lng, -122.4286, 1e-4);
}
{
  const [lat, lng] = destinationPoint(37.4636, -122.4286, 90, 1000);
  check("due-east travel leaves latitude ~unchanged", lat, 37.4636, 1e-4);
  check("due-east travel increases longitude", lng > -122.4286 ? 1 : 0, 1);
}
{
  const [lat, lng] = destinationPoint(0, 0, 90, 111320);
  check("~111.32km east at the equator is ~1 degree of longitude", lng, 1, 0.01);
  check("travel along the equator stays at the equator", lat, 0, 1e-6);
}

console.log("\nbuildFovConePolygon - shape and direction sanity");
{
  const originLat = 37.4636;
  const originLng = -122.4286;
  const poly = buildFovConePolygon(originLat, originLng, 90, 90, 100, 10);
  check("polygon starts at the origin (lat)", poly[0][0], originLat);
  check("polygon starts at the origin (lng)", poly[0][1], originLng);
  check("polygon closes back at the origin (lat)", poly[poly.length - 1][0], originLat);
  check("polygon has origin + (arcSteps+1) arc points + closing origin", poly.length, 1 + 11 + 1);

  const middleArcPoint = poly[6];
  check("center of a 90deg-centered cone points further east than origin", middleArcPoint[1] > originLng ? 1 : 0, 1);
  check("center of a 90deg-centered cone stays close to origin latitude (due east)", middleArcPoint[0], originLat, 0.002);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
