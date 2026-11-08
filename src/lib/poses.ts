/**
 * Preset body positions for the movement diagram, seen from the side, facing right.
 * Angles are absolute, in degrees: 0 points straight down, 90 forward (right),
 * 180 straight up, -90 backward. "far" limbs are drawn behind the body, "near" in front.
 *
 * Order: [torso, upperArmFar, forearmFar, upperArmNear, forearmNear, thighFar, shinFar, thighNear, shinNear]
 * The coach only names poses; the angles live here so the form shown is right.
 * Plank-type poses were solved so hands and feet both meet the floor.
 */
export type Pose = readonly [number, number, number, number, number, number, number, number, number];

export const POSES: Record<string, Pose> = {
  // Standing and general
  stand: [180, 4, 8, -4, 4, -3, 0, 3, 0],
  'arms-up': [180, 172, 178, 186, 182, -3, 0, 3, 0],
  'arms-forward': [180, 92, 92, 88, 88, -3, 0, 3, 0],
  'athletic-stance': [158, 45, 95, 40, 88, 28, -22, 32, -22],
  // Lower body
  'squat-half': [160, 75, 80, 70, 75, 42, -20, 46, -18],
  'squat-bottom': [145, 95, 95, 90, 90, 78, -22, 82, -20],
  lunge: [180, 6, 8, -6, 0, -15, -78, 75, 0],
  hinge: [110, 0, 0, -3, -3, 8, -4, 12, -2],
  'row-top': [118, -130, 0, -125, 0, 8, -4, 12, -2],
  // Upper body
  'press-start': [180, 50, 175, 55, 178, -3, 0, 3, 0],
  'press-top': [180, 172, 178, 186, 182, -3, 0, 3, 0],
  'curl-top': [180, 3, 165, -3, 160, -3, 0, 3, 0],
  // Floor
  'plank-high': [117, 0, 0, 3, 3, -63, -63, -63, -63],
  'pushup-bottom': [96, -120, 0, -117, 0, -84, -84, -84, -84],
  'plank-forearm': [103, 0, 90, 3, 90, -77, -77, -77, -77],
  'down-dog': [56, 56, 56, 58, 58, -30, -30, -28, -28],
  tree: [180, 172, 185, 188, 175, -2, 0, 55, -60],
  // Running and jumping
  'run-a': [172, 40, 125, -40, 40, -35, -95, 55, -15],
  'run-b': [172, -40, 40, 40, 125, 55, -15, -35, -95],
  jump: [175, 160, 170, 165, 175, 25, -25, 30, -30],
  // Martial arts and boxing
  guard: [180, 35, 165, 25, 170, -15, 0, 15, 0],
  jab: [178, 35, 165, 90, 90, -15, 0, 15, 0],
  cross: [170, 90, 90, 25, 170, -15, 0, 15, 0],
  'front-kick': [190, 35, 165, 25, 170, -5, 0, 95, 92],
  'knee-strike': [185, 60, 120, 50, 120, -5, 0, 120, -10],
  // Ball sports
  'shot-set': [178, 125, 190, 130, 200, 20, -20, 22, -20],
  'shot-release': [182, 155, 170, 160, 160, 0, 0, 2, 0],
  // Swimming (lying in the water, head to the right)
  streamline: [92, 90, 90, 92, 92, -90, -90, -88, -88],
  'crawl-catch': [92, -160, 120, 60, 40, -95, -85, -85, -95],
  'crawl-pull': [92, 95, 95, 10, -40, -85, -95, -95, -85],
  'crawl-recover': [92, 60, 40, -160, 120, -95, -85, -85, -95],
  'flutter-a': [92, 90, 90, 92, 92, -80, -70, -100, -110],
  'flutter-b': [92, 90, 90, 92, 92, -100, -110, -80, -70],
  'breast-pull': [95, 45, 10, 45, 10, -90, -90, -90, -90],
  'breast-kick': [92, 100, 100, 100, 100, -60, -165, -60, -165],
};

export const POSE_NAMES = Object.keys(POSES);

/** Body parts the diagram can circle, and the joint each one points at. */
export const FOCUS = ['head', 'shoulders', 'elbows', 'hands', 'back', 'hips', 'knees', 'feet'] as const;
export type Focus = (typeof FOCUS)[number];

/** Segment lengths, in body units (standing height is about 100). */
export const LEN = { torso: 34, neck: 10, head: 8, upperArm: 18, forearm: 17, thigh: 22, shin: 22 } as const;
